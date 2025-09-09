
<?php
// Register REST API endpoint for updating order payment method with balance handling
add_action('rest_api_init', function () {
    register_rest_route('ims/v1', '/sales/(?P<orderId>\d+)/payment-method', array(
        'methods' => 'PUT',
        'callback' => 'ims_update_order_payment_method',
        'permission_callback' => '__return_true',
        'args' => array(
            'orderId' => array(
                'required' => true,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param > 0;
                }
            ),
            'paymentMethod' => array(
                'required' => true,
                'validate_callback' => function($param) {
                    return in_array($param, ['cash', 'credit', 'card', 'bank_transfer']);
                }
            ),
            'customerId' => array(
                'required' => false,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param > 0;
                }
            ),
            'previousPaymentMethod' => array(
                'required' => true,
            ),
            'orderTotal' => array(
                'required' => true,
                'validate_callback' => function($param) {
                    return is_numeric($param) && $param >= 0;
                }
            ),
            'orderNumber' => array(
                'required' => true,
            )
        )
    ));
});

// Callback to handle order payment method update with customer balance changes
function ims_update_order_payment_method(WP_REST_Request $request) {
    global $wpdb;
    
    $order_id = $request->get_param('orderId');
    $payment_method = $request->get_param('paymentMethod');
    $customer_id = $request->get_param('customerId');
    $previous_payment_method = $request->get_param('previousPaymentMethod');
    $order_total = floatval($request->get_param('orderTotal'));
    $order_number = $request->get_param('orderNumber');

    // Check if order exists
    $order = $wpdb->get_row(
        $wpdb->prepare("SELECT * FROM {$wpdb->prefix}ims_sales WHERE id = %d", $order_id)
    );

    if (!$order) {
        return new WP_Error('no_order', 'Order not found', array('status' => 404));
    }

    // Start transaction
    $wpdb->query('START TRANSACTION');

    try {
        // Update order payment method
        $updated = $wpdb->update(
            "{$wpdb->prefix}ims_sales",
            array(
                'payment_method' => $payment_method,
                'updated_at' => current_time('mysql', true)
            ),
            array('id' => $order_id),
            array('%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            throw new Exception('Failed to update order payment method');
        }

        // Handle customer balance updates if customer is involved
        if ($customer_id && $customer_id > 0) {
            // Check if customer exists
            $customer = $wpdb->get_row(
                $wpdb->prepare("SELECT * FROM {$wpdb->prefix}ims_customers WHERE id = %d", $customer_id)
            );

            if (!$customer) {
                throw new Exception('Customer not found');
            }

            // Get current customer balance
            $current_balance = floatval($customer->current_balance);
            $balance_change = 0;
            $balance_description = '';
            $transaction_type = '';

            // Calculate tax-free amount for balance calculations
            $tax_free_amount = $order_total; // Assuming order_total is already tax-free
            
            // Determine balance change based on payment method transition
            if ($previous_payment_method === 'cash' && $payment_method === 'credit') {
                // Cash to Credit: Customer now owes money
                $balance_change = $tax_free_amount;
                $transaction_type = 'credit';
                $balance_description = "Order {$order_number} payment changed from cash to credit - customer now owes amount (tax-free)";
                
            } elseif ($previous_payment_method === 'credit' && $payment_method === 'cash') {
                // Credit to Cash: Customer paid, reduce their debt
                $balance_change = -$tax_free_amount;
                $transaction_type = 'debit';
                $balance_description = "Order {$order_number} payment changed from credit to cash - debt cleared (tax-free)";
                
            } elseif ($previous_payment_method === 'credit' && in_array($payment_method, ['card', 'bank_transfer'])) {
                // Credit to electronic payment: Customer paid, reduce debt
                $balance_change = -$tax_free_amount;
                $transaction_type = 'debit';
                $balance_description = "Order {$order_number} payment changed from credit to {$payment_method} - debt cleared (tax-free)";
                
            } elseif (in_array($previous_payment_method, ['card', 'bank_transfer']) && $payment_method === 'credit') {
                // Electronic payment to Credit: Customer now owes money
                $balance_change = $tax_free_amount;
                $transaction_type = 'credit';
                $balance_description = "Order {$order_number} payment changed from {$previous_payment_method} to credit (tax-free)";
            }

            // Update customer balance if there's a change
            if ($balance_change != 0) {
                $new_balance = $current_balance + $balance_change;
                
                // Update customer's current balance
                $balance_updated = $wpdb->update(
                    "{$wpdb->prefix}ims_customers",
                    array('current_balance' => $new_balance),
                    array('id' => $customer_id),
                    array('%f'),
                    array('%d')
                );

                if ($balance_updated === false) {
                    throw new Exception('Failed to update customer balance');
                }

                // Insert balance history record
                $history_inserted = $wpdb->insert(
                    "{$wpdb->prefix}ims_customer_balance_history",
                    array(
                        'customer_id' => $customer_id,
                        'order_id' => $order_id,
                        'amount' => abs($balance_change),
                        'type' => $transaction_type,
                        'order_number' => $order_number,
                        'description' => $balance_description,
                        'previous_balance' => $current_balance,
                        'new_balance' => $new_balance,
                        'created_at' => current_time('mysql', true)
                    ),
                    array('%d', '%d', '%f', '%s', '%s', '%s', '%f', '%f', '%s')
                );

                if ($history_inserted === false) {
                    error_log('Failed to insert balance history record for customer ' . $customer_id);
                }
            }
        }

        $wpdb->query('COMMIT');

        // Fetch updated order data
        $updated_order = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT s.*, c.name AS customer_name 
                 FROM {$wpdb->prefix}ims_sales s
                 LEFT JOIN {$wpdb->prefix}ims_customers c ON s.customer_id = c.id
                 WHERE s.id = %d",
                $order_id
            ),
            ARRAY_A
        );

        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Payment method and customer balance updated successfully',
            'data' => array(
                'orderId' => (int)$order_id,
                'paymentMethod' => $payment_method,
                'previousPaymentMethod' => $previous_payment_method,
                'customerBalance' => isset($new_balance) ? $new_balance : $current_balance,
                'balanceChange' => $balance_change,
                'taxFreeAmount' => $tax_free_amount,
                'updatedAt' => gmdate('c'),
                'order' => $updated_order
            )
        ));

    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        error_log('Payment method update failed: ' . $e->getMessage());
        return new WP_Error('update_failed', $e->getMessage(), array('status' => 500));
    }
}

// Enhanced customer balance history table creation
register_activation_hook(__FILE__, 'ims_create_enhanced_customer_balance_history_table');

function ims_create_enhanced_customer_balance_history_table() {
    global $wpdb;

    $table_name = $wpdb->prefix . 'ims_customer_balance_history';

    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        customer_id bigint(20) NOT NULL,
        order_id bigint(20) DEFAULT NULL,
        amount decimal(10,2) NOT NULL,
        type enum('credit','debit','adjustment') NOT NULL,
        order_number varchar(50) DEFAULT NULL,
        description text,
        previous_balance decimal(10,2) DEFAULT 0,
        new_balance decimal(10,2) NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        created_by varchar(100) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY customer_id (customer_id),
        KEY order_id (order_id),
        KEY created_at (created_at),
        KEY type (type)
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
?>
