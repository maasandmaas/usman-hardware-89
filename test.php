<?php
// Inventory.php functionality here

/**
 * WordPress Inventory Management System - API Functions
 * Add these functions to your theme's functions.php file
 * Modified for public access without authentication
 */

// Hook to initialize API endpoints
add_action('init', 'ims_init_inventory_api');

function ims_init_inventory_api() {
    // Register REST API routes
    add_action('rest_api_init', 'ims_register_inventory_routes');
}

function ims_register_inventory_routes() {
    // GET /wp-json/ims/v1/inventory
    register_rest_route('ims/v1', '/inventory', array(
        'methods' => 'GET',
        'callback' => 'ims_get_inventory',
        'permission_callback' => '__return_true' // No authentication required
    ));

    // GET /wp-json/ims/v1/inventory/movements
    register_rest_route('ims/v1', '/inventory/movements', array(
        'methods' => 'GET',
        'callback' => 'ims_get_inventory_movements',
        'permission_callback' => '__return_true' // No authentication required
    ));

    // POST /wp-json/ims/v1/inventory/restock
    register_rest_route('ims/v1', '/inventory/restock', array(
        'methods' => 'POST',
        'callback' => 'ims_restock_inventory',
        'permission_callback' => '__return_true' // No authentication required
    ));
}

/**
 * GET /inventory - Get inventory list with filtering and pagination
 */
function ims_get_inventory($request) {
    global $wpdb;
    
    try {
        // Get query parameters
        $page = intval($request->get_param('page')) ?: 1;
        $limit = intval($request->get_param('limit')) ?: 20;
        $category = sanitize_text_field($request->get_param('category'));
        $low_stock = $request->get_param('lowStock') === 'true';
        $out_of_stock = $request->get_param('outOfStock') === 'true';
        
        $offset = ($page - 1) * $limit;
        
        // Build base query
        $sql = "
            SELECT 
                p.id as productId,
                p.name as productName,
                p.sku,
                c.name as category,
                p.stock as currentStock,
                p.min_stock as minStock,
                p.max_stock as maxStock,
                p.unit,
                (p.stock * p.cost_price) as value,
                p.updated_at as lastRestocked,
                CASE 
                    WHEN p.stock = 0 THEN 'out'
                    WHEN p.stock <= p.min_stock THEN 'low'
                    ELSE 'adequate'
                END as stockStatus
            FROM {$wpdb->prefix}ims_products p
            LEFT JOIN {$wpdb->prefix}ims_categories c ON p.category_id = c.id
            WHERE p.status = 'active'
        ";
        
        $where_conditions = array();
        $params = array();
        
        // Add category filter
        if ($category) {
            $where_conditions[] = "c.name = %s";
            $params[] = $category;
        }
        
        // Add stock filters
        if ($low_stock) {
            $where_conditions[] = "p.stock <= p.min_stock AND p.stock > 0";
        }
        
        if ($out_of_stock) {
            $where_conditions[] = "p.stock = 0";
        }
        
        // Apply WHERE conditions
        if (!empty($where_conditions)) {
            $sql .= " AND " . implode(' AND ', $where_conditions);
        }
        
        // Add ordering and pagination
        $sql .= " ORDER BY p.name ASC LIMIT %d OFFSET %d";
        $params[] = $limit;
        $params[] = $offset;
        
        // Execute query
        if (!empty($params)) {
            $prepared_sql = $wpdb->prepare($sql, $params);
        } else {
            $prepared_sql = $sql;
        }
        
        $inventory = $wpdb->get_results($prepared_sql);
        
        // Get summary data
        $summary_sql = "
            SELECT 
                COUNT(*) as totalProducts,
                SUM(p.stock * p.cost_price) as totalValue,
                SUM(CASE WHEN p.stock <= p.min_stock AND p.stock > 0 THEN 1 ELSE 0 END) as lowStockItems,
                SUM(CASE WHEN p.stock = 0 THEN 1 ELSE 0 END) as outOfStockItems
            FROM {$wpdb->prefix}ims_products p
            WHERE p.status = 'active'
        ";
        
        $summary = $wpdb->get_row($summary_sql);
        
        
        // Format response
        $formatted_inventory = array();
        foreach ($inventory as $item) {
            $formatted_inventory[] = array(
                'productId' => intval($item->productId),
                'productName' => $item->productName,
                'sku' => $item->sku,
                'category' => $item->category,
                'currentStock' => floatval($item->currentStock), // Fixed: Use floatval for decimal stock values
                'minStock' => floatval($item->minStock), // Fixed: Use floatval for decimal values
                'maxStock' => floatval($item->maxStock), // Fixed: Use floatval for decimal values
                'unit' => $item->unit,
                'value' => floatval($item->value),
                'lastRestocked' => date('Y-m-d', strtotime($item->lastRestocked)),
                'stockStatus' => $item->stockStatus
            );
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array(
                'inventory' => $formatted_inventory,
                'summary' => array(
                    'totalProducts' => intval($summary->totalProducts),
                    'totalValue' => floatval($summary->totalValue),
                    'lowStockItems' => intval($summary->lowStockItems),
                    'outOfStockItems' => intval($summary->outOfStockItems)
                )
            )
        ), 200);
        
    } catch (Exception $e) {
        return new WP_Error('database_error', 'Database error occurred', array('status' => 500));
    }
}

/**
 * GET /inventory/movements - Get inventory movement history
 */
function ims_get_inventory_movements($request) {
    global $wpdb;
    
    try {
        // Get query parameters
        $page = intval($request->get_param('page')) ?: 1;
        $limit = intval($request->get_param('limit')) ?: 20;
        $product_id = intval($request->get_param('productId'));
        $type = sanitize_text_field($request->get_param('type'));
        $date_from = sanitize_text_field($request->get_param('dateFrom'));
        $date_to = sanitize_text_field($request->get_param('dateTo'));
        
        $offset = ($page - 1) * $limit;
        
        // Build query
        $sql = "
            SELECT 
                im.id,
                im.product_id as productId,
                p.name as productName,
                im.type,
                im.quantity,
                im.balance_before as balanceBefore,
                im.balance_after as balanceAfter,
                im.reference,
                im.reason,
                im.created_at as createdAt
            FROM {$wpdb->prefix}ims_inventory_movements im
            LEFT JOIN {$wpdb->prefix}ims_products p ON im.product_id = p.id
            WHERE 1=1
        ";
        
        $where_conditions = array();
        $params = array();
        
        // Add filters
        if ($product_id) {
            $where_conditions[] = "im.product_id = %d";
            $params[] = $product_id;
        }
        
        if ($type) {
            $where_conditions[] = "im.type = %s";
            $params[] = $type;
        }
        
        if ($date_from) {
            $where_conditions[] = "DATE(im.created_at) >= %s";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $where_conditions[] = "DATE(im.created_at) <= %s";
            $params[] = $date_to;
        }
        
        // Apply WHERE conditions
        if (!empty($where_conditions)) {
            $sql .= " AND " . implode(' AND ', $where_conditions);
        }
        
        // Get total count for pagination
        $count_sql = str_replace(
            "SELECT im.id, im.product_id as productId, p.name as productName, im.type, im.quantity, im.balance_before as balanceBefore, im.balance_after as balanceAfter, im.reference, im.reason, im.created_at as createdAt",
            "SELECT COUNT(*) as total",
            $sql
        );
        
        if (!empty($params)) {
            $total_items = $wpdb->get_var($wpdb->prepare($count_sql, $params));
        } else {
            $total_items = $wpdb->get_var($count_sql);
        }
        
        // Add ordering and pagination to main query
        $sql .= " ORDER BY im.created_at DESC LIMIT %d OFFSET %d";
        $params[] = $limit;
        $params[] = $offset;
        
        // Execute query
        if (!empty($params)) {
            $movements = $wpdb->get_results($wpdb->prepare($sql, $params));
        } else {
            $movements = $wpdb->get_results($sql);
        }
        
        // Format response
        $formatted_movements = array();
        foreach ($movements as $movement) {
            $formatted_movements[] = array(
                'id' => intval($movement->id),
                'productId' => intval($movement->productId),
                'productName' => $movement->productName,
                'type' => $movement->type,
                'quantity' => floatval($movement->quantity), // Fixed: Use floatval for decimal quantities
                'balanceBefore' => floatval($movement->balanceBefore), // Fixed: Use floatval for decimal balances
                'balanceAfter' => floatval($movement->balanceAfter), // Fixed: Use floatval for decimal balances
                'reference' => $movement->reference,
                'reason' => $movement->reason,
                'createdAt' => date('c', strtotime($movement->createdAt))
            );
        }
        
        $total_pages = ceil($total_items / $limit);
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array(
                'movements' => $formatted_movements,
                'pagination' => array(
                    'currentPage' => $page,
                    'totalPages' => $total_pages,
                    'totalItems' => intval($total_items),
                    'itemsPerPage' => $limit
                )
            )
        ), 200);
        
    } catch (Exception $e) {
        return new WP_Error('database_error', 'Database error occurred', array('status' => 500));
    }
}

/**
 * POST /inventory/restock - Restock inventory
 */
function ims_restock_inventory($request) {
    global $wpdb;
    
    try {
        // Get request body
        $body = $request->get_json_params();
        
        if (!$body) {
            return new WP_Error('invalid_json', 'Invalid JSON in request body', array('status' => 400));
        }
        
        // Validate required fields
        $required_fields = array('productId', 'quantity');
        foreach ($required_fields as $field) {
            if (!isset($body[$field]) || empty($body[$field])) {
                return new WP_Error('missing_field', "Field '$field' is required", array('status' => 400));
            }
        }
        
        $product_id = intval($body['productId']);
        $quantity = floatval($body['quantity']); // Fixed: Use floatval for decimal quantities
        $cost_price = isset($body['costPrice']) ? floatval($body['costPrice']) : null;
        $supplier_id = isset($body['supplierId']) ? intval($body['supplierId']) : null;
        $purchase_order_id = isset($body['purchaseOrderId']) ? intval($body['purchaseOrderId']) : null;
        $notes = isset($body['notes']) ? sanitize_text_field($body['notes']) : '';
        
        // Validate quantity
        if ($quantity <= 0) {
            return new WP_Error('invalid_quantity', 'Quantity must be greater than 0', array('status' => 400));
        }
        
        // Start transaction
        $wpdb->query('START TRANSACTION');
        
        // Get current product stock
        $current_product = $wpdb->get_row($wpdb->prepare(
            "SELECT id, stock, cost_price FROM {$wpdb->prefix}ims_products WHERE id = %d AND status = 'active'",
            $product_id
        ));
        
        if (!$current_product) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('product_not_found', 'Product not found or inactive', array('status' => 404));
        }
        
        $balance_before = floatval($current_product->stock); // Fixed: Use floatval for decimal stock
        $balance_after = $balance_before + $quantity;
        
        // Update product stock
        $update_result = $wpdb->update(
            $wpdb->prefix . 'ims_products',
            array(
                'stock' => $balance_after,
                'cost_price' => $cost_price ?: $current_product->cost_price,
                'updated_at' => current_time('mysql')
            ),
            array('id' => $product_id),
            array('%f', '%f', '%s'), // Fixed: Use %f for stock (decimal)
            array('%d')
        );
        
        if ($update_result === false) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('update_failed', 'Failed to update product stock', array('status' => 500));
        }
        
        // Create inventory movement record
        $movement_result = $wpdb->insert(
            $wpdb->prefix . 'ims_inventory_movements',
            array(
                'product_id' => $product_id,
                'type' => 'purchase',
                'quantity' => $quantity,
                'balance_before' => $balance_before,
                'balance_after' => $balance_after,
                'reference' => $purchase_order_id ? "PO-{$purchase_order_id}" : "RESTOCK-" . time(),
                'reason' => $notes ?: 'Manual restock',
                'created_at' => current_time('mysql')
            ),
            array('%d', '%s', '%f', '%f', '%f', '%s', '%s', '%s') // Fixed: Use %f for decimal quantities and balances
        );
        
        if ($movement_result === false) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('movement_failed', 'Failed to create inventory movement', array('status' => 500));
        }
        
        $movement_id = $wpdb->insert_id;
        
        // Update supplier totals if supplier is provided
        if ($supplier_id && $cost_price) {
            $total_purchase = $quantity * $cost_price;
            $wpdb->query($wpdb->prepare(
                "UPDATE {$wpdb->prefix}ims_suppliers 
                 SET total_purchases = total_purchases + %f,
                     updated_at = %s
                 WHERE id = %d",
                $total_purchase,
                current_time('mysql'),
                $supplier_id
            ));
        }
        
        // Commit transaction
        $wpdb->query('COMMIT');
        
        return new WP_REST_Response(array(
            'success' => true,
            'data' => array(
                'newStock' => $balance_after,
                'movement' => array(
                    'id' => $movement_id,
                    'type' => 'restock',
                    'quantity' => $quantity,
                    'balanceAfter' => $balance_after
                )
            ),
            'message' => 'Stock updated successfully'
        ), 200);
        
    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('database_error', 'Database error occurred', array('status' => 500));
    }
}

/**
 * Utility function to get database table name with WordPress prefix
 */
function ims_get_table_name($table_name) {
    global $wpdb;
    return $wpdb->prefix . $table_name;
}

/**
 * Error handler for API responses
 */
function ims_handle_api_error($error_code, $message, $status_code = 500) {
    return new WP_Error($error_code, $message, array('status' => $status_code));
}

// Optional: Add CORS support if needed
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        return $value;
    });
});


// Register REST API routes for Inventory Management System
add_action('rest_api_init', function () {
    // 1. Get Order Details
    register_rest_route('ims/v1', '/sales/(?P<orderId>\d+)', array(
        'methods' => 'GET',
        'callback' => 'ims_get_order_details',
        'permission_callback' => '__return_true', // Open access
    ));

    // 2. Update Order Status
    register_rest_route('ims/v1', '/sales/(?P<orderId>\d+)/status', array(
        'methods' => 'PUT',
        'callback' => 'ims_update_order_status',
        'permission_callback' => '__return_true',
    ));

    // 3. Update Order Details
    register_rest_route('ims/v1', '/sales/(?P<orderId>\d+)/details', array(
        'methods' => 'PUT',
        'callback' => 'ims_update_order_details',
        'permission_callback' => '__return_true',
    ));

    // 4. Return Items (Partial)
    register_rest_route('ims/v1', '/sales/(?P<orderId>\d+)/adjust', array(
        'methods' => 'POST',
        'callback' => 'ims_return_items',
        'permission_callback' => '__return_true',
    ));

    // 5. Complete Order Reversal
    register_rest_route('ims/v1', '/sales/(?P<orderId>\d+)/revert', array(
        'methods' => 'POST',
        'callback' => 'ims_revert_order',
        'permission_callback' => '__return_true',
    ));

  
});

// 1. Get Order Details
function ims_get_order_details($request) {
    global $wpdb;
    $order_id = $request['orderId'];

    // Fetch order
    $order = $wpdb->get_row($wpdb->prepare(
        "SELECT s.*, c.name AS customer_name, u.user_login AS created_by
         FROM {$wpdb->prefix}ims_sales s
         LEFT JOIN {$wpdb->prefix}ims_customers c ON s.customer_id = c.id
         LEFT JOIN {$wpdb->prefix}users u ON s.created_by = u.ID
         WHERE s.id = %d",
        $order_id
    ));

    if (!$order) {
        return new WP_Error('no_order', 'Order not found', array('status' => 404));
    }

    // Fetch order items
    $items = $wpdb->get_results($wpdb->prepare(
        "SELECT si.*, p.name AS product_name
         FROM {$wpdb->prefix}ims_sale_items si
         JOIN {$wpdb->prefix}ims_products p ON si.product_id = p.id
         WHERE si.sale_id = %d",
        $order_id
    ));

    $response = array(
        'success' => true,
        'data' => array(
            'id' => (int)$order->id,
            'orderNumber' => $order->order_number,
            'customerId' => (int)$order->customer_id,
            'customerName' => $order->customer_name,
            'date' => $order->date,
            'time' => $order->time,
            'items' => array_map(function ($item) {
                return array(
                    'productId' => (int)$item->product_id,
                    'productName' => $item->product_name,
                    'quantity' => (int)$item->quantity,
                    'unitPrice' => (float)$item->unit_price,
                    'total' => (float)$item->total,
                );
            }, $items),
            'subtotal' => (float)$order->subtotal,
            'discount' => (float)$order->discount,
            'total' => (float)$order->total,
            'paymentMethod' => $order->payment_method,
            'status' => $order->status,
            'notes' => $order->notes,
            'createdBy' => $order->created_by,
            'createdAt' => gmdate('c', strtotime($order->created_at)),
        ),
    );

    return rest_ensure_response($response);
}
function ims_update_order_status($request) {
    global $wpdb;
    $order_id = $request['orderId'];
    $params = $request->get_json_params();

    // Validate status
    if (!isset($params['status']) || !in_array($params['status'], ['pending', 'completed', 'cancelled'])) {
        return new WP_Error('invalid_status', 'Invalid status provided', array('status' => 400));
    }

    // Check if order exists
    $order = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}ims_sales WHERE id = %d",
        $order_id
    ));

    if (!$order) {
        return new WP_Error('no_order', 'Order not found', array('status' => 404));
    }

    // Start transaction
    $wpdb->query('START TRANSACTION');

    try {
        $inventory_adjustments = array();

        // Handle inventory adjustments if changing from cancelled to completed
        if ($order->status === 'cancelled' && $params['status'] === 'completed') {
            // Fetch order items
            $items = $wpdb->get_results($wpdb->prepare(
                "SELECT product_id, quantity FROM {$wpdb->prefix}ims_sale_items WHERE sale_id = %d",
                $order_id
            ));

            if (empty($items)) {
                throw new Exception('No items found for order ID: ' . $order_id);
            }

            foreach ($items as $item) {
                // Fetch current product stock
                $product = $wpdb->get_row($wpdb->prepare(
                    "SELECT id, stock FROM {$wpdb->prefix}ims_products WHERE id = %d",
                    $item->product_id
                ));

                if (!$product) {
                    throw new Exception('Product not found for ID: ' . $item->product_id);
                }

                // Check if sufficient stock is available
                $new_stock = $product->stock - $item->quantity;
                if ($new_stock < 0) {
                    throw new Exception('Insufficient stock for product ID: ' . $item->product_id . '. Current stock: ' . $product->stock . ', Required: ' . $item->quantity);
                }

                // Update product stock
                $updated = $wpdb->update(
                    "{$wpdb->prefix}ims_products",
                    array('stock' => $new_stock),
                    array('id' => $item->product_id),
                    array('%d'),
                    array('%d')
                );

                if ($updated === false) {
                    throw new Exception('Failed to update stock for product ID: ' . $item->product_id);
                }

                // Log inventory movement
                $wpdb->insert(
                    "{$wpdb->prefix}ims_inventory_movements",
                    array(
                        'product_id' => $item->product_id,
                        'type' => 'sale',
                        'quantity' => -$item->quantity,
                        'balance_before' => $product->stock,
                        'balance_after' => $new_stock,
                        'reference' => 'Order #' . $order->order_number,
                        'reason' => 'Order status changed to completed from cancelled',
                        'created_at' => current_time('mysql', true),
                    ),
                    array('%d', '%s', '%d', '%d', '%d', '%s', '%s', '%s')
                );

                $inventory_adjustments[] = array(
                    'productId' => (int)$item->product_id,
                    'quantityDeducted' => (int)$item->quantity,
                    'newStock' => (int)$new_stock,
                );
            }
        }

        // Update order status
        $updated = $wpdb->update(
            "{$wpdb->prefix}ims_sales",
            array(
                'status' => $params['status'],
                'updated_at' => current_time('mysql', true),
                'cancel_reason' => null,
            ),
            array('id' => $order_id),
            array('%s', '%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            throw new Exception('Failed to update order status for order ID: ' . $order_id);
        }

        // Commit transaction
        $wpdb->query('COMMIT');

        $response = array(
            'success' => true,
            'message' => 'Order status updated successfully',
            'data' => array(
                'id' => (int)$order_id,
                'status' => $params['status'],
                'updatedAt' => gmdate('c'),
                'inventoryAdjustments' => $inventory_adjustments,
            ),
        );

        return rest_ensure_response($response);

    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('update_failed', $e->getMessage(), array('status' => 400));
    }
}

function ims_update_order_details($request) {
    global $wpdb;
    $order_id = $request['orderId'];
    $params = $request->get_json_params();

    // Validate input
    if (empty($params)) {
        return new WP_Error('invalid_params', 'No valid parameters provided', array('status' => 400));
    }

    // Check if order exists
    $order = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}ims_sales WHERE id = %d",
        $order_id
    ));

    if (!$order) {
        return new WP_Error('no_order', 'Order not found', array('status' => 404));
    }

    // Prepare update data
    $update_data = array();
    $update_formats = array();
    $customer = null;

    if (isset($params['paymentMethod']) && in_array($params['paymentMethod'], ['cash', 'credit', 'bank_transfer', 'cheque'])) {
        $update_data['payment_method'] = $params['paymentMethod'];
        $update_formats[] = '%s';
    }

    if (isset($params['customerId'])) {
        $customer = $wpdb->get_row($wpdb->prepare(
            "SELECT id, name, current_balance, credit_limit FROM {$wpdb->prefix}ims_customers WHERE id = %d",
            $params['customerId']
        ));
        if (!$customer) {
            return new WP_Error('no_customer', 'Customer not found', array('status' => 404));
        }
        $update_data['customer_id'] = $params['customerId'];
        $update_formats[] = '%d';
    }

    if (isset($params['notes'])) {
        $update_data['notes'] = sanitize_text_field($params['notes']);
        $update_formats[] = '%s';
    }

    if (empty($update_data)) {
        return new WP_Error('no_updates', 'No valid fields to update', array('status' => 400));
    }

    $update_data['updated_at'] = current_time('mysql', true);
    $update_formats[] = '%s';

    // Handle credit balance updates
    $customer_id = $update_data['customer_id'] ?? $order->customer_id;
    if (!isset($customer)) {
        $customer = $wpdb->get_row($wpdb->prepare(
            "SELECT id, name, current_balance, credit_limit FROM {$wpdb->prefix}ims_customers WHERE id = %d",
            $customer_id
        ));
    }

    $new_payment_method = $update_data['payment_method'] ?? $order->payment_method;
    $old_payment_method = $order->payment_method;
    $order_total = $order->total;

    // Start a transaction to ensure data consistency
    $wpdb->query('START TRANSACTION');

    try {
        // Update customer balance if payment method changes
        if ($new_payment_method !== $old_payment_method) {
            if ($new_payment_method === 'credit' && $old_payment_method !== 'credit') {
                // Changing to credit: increase customer's current_balance
                $new_balance = $customer->current_balance + $order_total;
                if ($new_balance > $customer->credit_limit) {
                    throw new Exception('Credit limit exceeded for customer');
                }
                $wpdb->update(
                    "{$wpdb->prefix}ims_customers",
                    array('current_balance' => $new_balance),
                    array('id' => $customer_id),
                    array('%f'),
                    array('%d')
                );
            } elseif ($old_payment_method === 'credit' && $new_payment_method !== 'credit') {
                // Changing from credit to paid: decrease customer's current_balance
                $new_balance = max(0, $customer->current_balance - $order_total);
                $wpdb->update(
                    "{$wpdb->prefix}ims_customers",
                    array('current_balance' => $new_balance),
                    array('id' => $customer_id),
                    array('%f'),
                    array('%d')
                );

                // Optionally, record a payment in ims_payments
                $wpdb->insert(
                    "{$wpdb->prefix}ims_payments",
                    array(
                        'customer_id' => $customer_id,
                        'amount' => $order_total,
                        'payment_method' => $new_payment_method,
                        'reference' => 'Order #' . $order->order_number,
                        'notes' => 'Payment for order updated from credit to ' . $new_payment_method,
                        'date' => current_time('Y-m-d'),
                        'created_at' => current_time('mysql', true)
                    ),
                    array('%d', '%f', '%s', '%s', '%s', '%s', '%s')
                );
            }
        }

        // Update order
        $wpdb->update(
            "{$wpdb->prefix}ims_sales",
            $update_data,
            array('id' => $order_id),
            $update_formats,
            array('%d')
        );

        // Commit transaction
        $wpdb->query('COMMIT');

        // Fetch updated customer name
        $customer_name = $customer->name;

        $response = array(
            'success' => true,
            'message' => 'Order details updated successfully',
            'data' => array(
                'id' => (int)$order_id,
                'paymentMethod' => $new_payment_method,
                'customerId' => (int)$customer_id,
                'customerName' => $customer_name,
                'updatedAt' => gmdate('c'),
                'currentBalance' => $new_balance ?? $customer->current_balance // Include updated balance in response
            ),
        );

        return rest_ensure_response($response);

    } catch (Exception $e) {
        // Rollback transaction on error
        $wpdb->query('ROLLBACK');
        return new WP_Error('update_failed', $e->getMessage(), array('status' => 400));
    }
}

// 4. Return Items (Partial)
function ims_return_items($request) {
    global $wpdb;
    $order_id = $request['orderId'];
    $params = $request->get_json_params();

    // Validate input
    if (!isset($params['type']) || $params['type'] !== 'return' || empty($params['items']) || !isset($params['refundAmount']) || !isset($params['restockItems'])) {
        return new WP_Error('invalid_params', 'Invalid or missing parameters', array('status' => 400));
    }

    // Check if order exists and is completed
    $order = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}ims_sales WHERE id = %d AND status = 'completed'",
        $order_id
    ));

    // Validate input
    if (!isset($params['type']) || $params['type'] !== 'return' || empty($params['items']) || !isset($params['refundAmount']) || !isset($params['restockItems'])) {
        return new WP_Error('invalid_params', 'Invalid or missing parameters', array('status' => 400));
    }

    // Check if order exists and is completed
    $order = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}ims_sales WHERE id = %d AND status = 'completed'",
        $order_id
    ));

    if (!$order) {
        return new WP_Error('no_order', 'Order not found or not completed', array('status' => 404));
    }

    // Start transaction
    $wpdb->query('START TRANSACTION');

    try {
        // Create adjustment record
        $wpdb->insert(
            "{$wpdb->prefix}ims_sale_adjustments",
            array(
                'sale_id' => $order_id,
                'type' => 'return',
                'reason' => sanitize_text_field($params['adjustmentReason'] ?? ''),
                'refund_amount' => (float)$params['refundAmount'],
                'restock_items' => $params['restockItems'] ? 1 : 0,
                'processed_at' => current_time('mysql', true),
            ),
            array('%d', '%s', '%s', '%f', '%d', '%s')
        );

        $adjustment_id = $wpdb->insert_id;

        $updated_inventory = array();
        foreach ($params['items'] as $item) {
            if (!isset($item['productId']) || !isset($item['quantity']) || !isset($item['reason'])) {
                throw new Exception('Invalid item data');
            }

            // Verify sale item exists
            $sale_item = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}ims_sale_items WHERE sale_id = %d AND product_id = %d",
                $order_id, $item['productId']
            ));

            if (!$sale_item || $item['quantity'] > $sale_item->quantity) {
                throw new Exception('Invalid product or quantity');
            }

            // Update sale item quantity and total
            $new_quantity = $sale_item->quantity - $item['quantity'];
            $new_total = $new_quantity * $sale_item->unit_price;

            if ($new_quantity > 0) {
                // Update existing sale item
                $wpdb->update(
                    "{$wpdb->prefix}ims_sale_items",
                    array(
                        'quantity' => $new_quantity,
                        'total' => $new_total,
                    ),
                    array(
                        'sale_id' => $order_id,
                        'product_id' => $item['productId'],
                    ),
                    array('%f', '%f'), // Fixed: Use %f for decimal quantity
                    array('%d', '%d')
                );
            } else {
                // Delete sale item if quantity becomes 0
                $wpdb->delete(
                    "{$wpdb->prefix}ims_sale_items",
                    array(
                        'sale_id' => $order_id,
                        'product_id' => $item['productId'],
                    ),
                    array('%d', '%d')
                );
            }

            // Insert adjustment item
            $wpdb->insert(
                "{$wpdb->prefix}ims_sale_adjustment_items",
                array(
                    'adjustment_id' => $adjustment_id,
                    'product_id' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'reason' => sanitize_text_field($item['reason']),
                    'restocked' => $params['restockItems'] ? 1 : 0,
                ),
                array('%d', '%d', '%f', '%s', '%d') // Fixed: Use %f for decimal quantity
            );

            if ($params['restockItems']) {
                // Update inventory
                $product = $wpdb->get_row($wpdb->prepare(
                    "SELECT stock FROM {$wpdb->prefix}ims_products WHERE id = %d",
                    $item['productId']
                ));

                if (!$product) {
                    throw new Exception('Product not found');
                }

                $new_stock = $product->stock + $item['quantity'];
                $wpdb->update(
                    "{$wpdb->prefix}ims_products",
                    array('stock' => $new_stock),
                    array('id' => $item['productId']),
                    array('%f'), // Fixed: Use %f for decimal stock
                    array('%d')
                );

                // Log inventory movement
                $wpdb->insert(
                    "{$wpdb->prefix}ims_inventory_movements",
                    array(
                        'product_id' => $item['productId'],
                        'type' => 'return',
                        'quantity' => $item['quantity'],
                        'balance_before' => $product->stock,
                        'balance_after' => $new_stock,
                        'reference' => 'ADJ-' . $adjustment_id,
                        'reason' => $item['reason'],
                        'created_at' => current_time('mysql', true),
                    ),
                    array('%d', '%s', '%f', '%f', '%f', '%s', '%s', '%s') // Fixed: Use %f for decimal quantities and balances
                );

                $updated_inventory[] = array(
                    'productId' => (int)$item['productId'],
                    'newStock' => floatval($new_stock), // Fixed: Use floatval for decimal stock
                );
            }
        }

        // Update order totals
        $new_total = $order->total - $params['refundAmount'];
        $wpdb->update(
            "{$wpdb->prefix}ims_sales",
            array('total' => $new_total, 'subtotal' => $new_total, 'updated_at' => current_time('mysql', true)),
            array('id' => $order_id),
            array('%f', '%f', '%s'),
            array('%d')
        );

        $wpdb->query('COMMIT');

        $response = array(
            'success' => true,
            'message' => 'Items returned successfully',
            'data' => array(
                'adjustmentId' => (int)$adjustment_id,
                'orderId' => (int)$order_id,
                'refundAmount' => (float)$params['refundAmount'],
                'itemsReturned' => array_map(function ($item) use ($params) {
                    return array(
                        'productId' => (int)$item['productId'],
                        'quantity' => floatval($item['quantity']), // Fixed: Use floatval for decimal quantities
                        'restocked' => $params['restockItems'],
                    );
                }, $params['items']),
                'updatedInventory' => $updated_inventory,
                'processedAt' => gmdate('c'),
            ),
        );

        return rest_ensure_response($response);
    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('return_failed', $e->getMessage(), array('status' => 400));
    }

    // Start transaction
    $wpdb->query('START TRANSACTION');

    try {
        // Create adjustment record
        $wpdb->insert(
            "{$wpdb->prefix}ims_sale_adjustments",
            array(
                'sale_id' => $order_id,
                'type' => 'return',
                'reason' => sanitize_text_field($params['adjustmentReason'] ?? ''),
                'refund_amount' => (float)$params['refundAmount'],
                'restock_items' => $params['restockItems'] ? 1 : 0,
                'processed_at' => current_time('mysql', true),
            ),
            array('%d', '%s', '%s', '%f', '%d', '%s')
        );

        $adjustment_id = $wpdb->insert_id;

        $updated_inventory = array();
        foreach ($params['items'] as $item) {
            if (!isset($item['productId']) || !isset($item['quantity']) || !isset($item['reason'])) {
                throw new Exception('Invalid item data');
            }

            // Verify sale item exists
            $sale_item = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}ims_sale_items WHERE sale_id = %d AND product_id = %d",
                $order_id, $item['productId']
            ));

            if (!$sale_item || $item['quantity'] > $sale_item->quantity) {
                throw new Exception('Invalid product or quantity');
            }

            // Insert adjustment item
            $wpdb->insert(
                "{$wpdb->prefix}ims_sale_adjustment_items",
                array(
                    'adjustment_id' => $adjustment_id,
                    'product_id' => $item['productId'],
                    'quantity' => $item['quantity'],
                    'reason' => sanitize_text_field($item['reason']),
                    'restocked' => $params['restockItems'] ? 1 : 0,
                ),
                array('%d', '%d', '%d', '%s', '%d')
            );

            if ($params['restockItems']) {
                // Update inventory
                $product = $wpdb->get_row($wpdb->prepare(
                    "SELECT stock FROM {$wpdb->prefix}ims_products WHERE id = %d",
                    $item['productId']
                ));

                if (!$product) {
                    throw new Exception('Product not found');
                }

                $new_stock = $product->stock + $item['quantity'];
                $wpdb->update(
                    "{$wpdb->prefix}ims_products",
                    array('stock' => $new_stock),
                    array('id' => $item['productId']),
                    array('%d'),
                    array('%d')
                );

                // Log inventory movement
                $wpdb->insert(
                    "{$wpdb->prefix}ims_inventory_movements",
                    array(
                        'product_id' => $item['productId'],
                        'type' => 'return',
                        'quantity' => $item['quantity'],
                        'balance_before' => $product->stock,
                        'balance_after' => $new_stock,
                        'reference' => 'ADJ-' . $adjustment_id,
                        'reason' => $item['reason'],
                        'created_at' => current_time('mysql', true),
                    ),
                    array('%d', '%s', '%d', '%d', '%d', '%s', '%s', '%s')
                );

                $updated_inventory[] = array(
                    'productId' => (int)$item['productId'],
                    'newStock' => (int)$new_stock,
                );
            }
        }

        // Update order totals
        $new_total = $order->total - $params['refundAmount'];
        $wpdb->update(
            "{$wpdb->prefix}ims_sales",
            array('total' => $new_total, 'subtotal' => $new_total, 'updated_at' => current_time('mysql', true)),
            array('id' => $order_id),
            array('%f', '%f', '%s'),
            array('%d')
        );

        $wpdb->query('COMMIT');

        $response = array(
            'success' => true,
            'message' => 'Items returned successfully',
            'data' => array(
                'adjustmentId' => (int)$adjustment_id,
                'orderId' => (int)$order_id,
                'refundAmount' => (float)$params['refundAmount'],
                'itemsReturned' => array_map(function ($item) use ($params) {
                    return array(
                        'productId' => (int)$item['productId'],
                        'quantity' => (int)$item['quantity'],
                        'restocked' => $params['restockItems'],
                    );
                }, $params['items']),
                'updatedInventory' => $updated_inventory,
                'processedAt' => gmdate('c'),
            ),
        );

        return rest_ensure_response($response);
    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('return_failed', $e->getMessage(), array('status' => 400));
    }
}

function ims_revert_order($request) {
    global $wpdb;
    $order_id = $request['orderId'];
    $params = $request->get_json_params();

    // Validate input
    if (!isset($params['reason']) || !isset($params['restoreInventory']) || !isset($paramsprocessRefund'])) {
        return new WP_Error('invalid_params', 'Missing required parameters', array('status' => 400));
    }

    // Check if order exists and is not already cancelled
    $order = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}ims_sales WHERE id = %d AND status != 'cancelled'",
        $order_id
    ));

    if (!$order) {
        return new WP_Error('no_order', 'Order not found or already cancelled', array('status' => 404));
    }

    // Check if a full_reversal adjustment already exists
    $existing_adjustment = $wpdb->get_row($wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}ims_sale_adjustments WHERE sale_id = %d AND type = 'full_reversal'",
        $order_id
    ));

    if ($existing_adjustment) {
        return new WP_Error('already_reversed', 'Order has already been reversed', array('status' => 400));
    }

    // Start transaction
    $wpdb->query('START TRANSACTION');

    try {
        // Create adjustment record
        $wpdb->insert(
            "{$wpdb->prefix}ims_sale_adjustments",
            array(
                'sale_id' => $order_id,
                'type' => 'full_reversal',
                'reason' => sanitize_text_field($params['reason']),
                'refund_amount' => (float)$order->total,
                'restock_items' => $params['restoreInventory'] ? 1 : 0,
                'processed_at' => current_time('mysql', true),
            ),
            array('%d', '%s', '%s', '%f', '%d', '%s')
        );

        $adjustment_id = $wpdb->insert_id;
        $inventory_restored = array();

        if ($params['restoreInventory']) {
            // Fetch order items
            $items = $wpdb->get_results($wpdb->prepare(
                "SELECT product_id, quantity FROM {$wpdb->prefix}ims_sale_items WHERE sale_id = %d",
                $order_id
            ));

            if (empty($items)) {
                throw new Exception('No items found for order ID: ' . $order_id);
            }

            foreach ($items as $item) {
                $product = $wpdb->get_row($wpdb->prepare(
                    "SELECT id, stock FROM {$wpdb->prefix}ims_products WHERE id = %d",
                    $item->product_id
                ));

                if (!$product) {
                    throw new Exception('Product not found for ID: ' . $item->product_id);
                }

                $new_stock = $product->stock + $item->quantity;

                // Update product stock
                $updated = $wpdb->update(
                    "{$wpdb->prefix}ims_products",
                    array('stock' => $new_stock),
                    array('id' => $item->product_id),
                    array('%d'),
                    array('%d')
                );

                if ($updated === false) {
                    throw new Exception('Failed to update stock for product ID: ' . $item->product_id);
                }

                // Log inventory movement
                $wpdb->insert(
                    "{$wpdb->prefix}ims_inventory_movements",
                    array(
                        'product_id' => $item->product_id,
                        'type' => 'return',
                        'quantity' => $item->quantity,
                        'balance_before' => $product->stock,
                        'balance_after' => $new_stock,
                        'reference' => 'ADJ-' . $adjustment_id,
                        'reason' => $params['reason'],
                        'created_at' => current_time('mysql', true),
                    ),
                    array('%d', '%s', '%d', '%d', '%d', '%s', '%s', '%s')
                );

                $inventory_restored[] = array(
                    'productId' => (int)$item->product_id,
                    'quantityRestored' => (int)$item->quantity,
                    'newStock' => (int)$new_stock,
                );
            }
        }

        // Update order status
        $updated = $wpdb->update(
            "{$wpdb->prefix}ims_sales",
            array(
                'status' => 'cancelled',
                'cancel_reason' => sanitize_text_field($params['reason']),
                'updated_at' => current_time('mysql', true),
            ),
            array('id' => $order_id),
            array('%s', '%s', '%s'),
            array('%d')
        );

        if ($updated === false) {
            throw new Exception('Failed to update order status for order ID: ' . $order_id);
        }

        // Commit transaction
        $wpdb->query('COMMIT');

        $response = array(
            'success' => true,
            'message' => 'Order completely reverted successfully',
            'data' => array(
                'orderId' => (int)$order_id,
                'originalStatus' => $order->status,
                'newStatus' => 'cancelled',
                'refundAmount' => (float)$order->total,
                'inventoryRestored' => $inventory_restored,
                'adjustmentRecord' => array(
                    'id' => (int)$adjustment_id,
                    'type' => 'full_reversal',
                    'reason' => $params['reason'],
                ),
                'processedAt' => gmdate('c'),
            ),
        );

        return rest_ensure_response($response);
    } catch (Exception $e) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('revert_failed', $e->getMessage(), array('status' => 400));
    }
}

/**
 * Inventory Status API
 * GET /wp-json/ims/v1/dashboard/inventory-status
 */
function ims_get_inventory_status($request) {
    global $wpdb;
    
    $products_table = $wpdb->prefix . 'ims_products';
    $categories_table = $wpdb->prefix . 'ims_categories';
    $sale_items_table = $wpdb->prefix . 'ims_sale_items';
    $sales_table = $wpdb->prefix . 'ims_sales';
    
    // Get inventory status by category
    $query = "
        SELECT 
            c.name as category,
            SUM(p.stock) as stock,
            COALESCE(sold_data.sold, 0) as sold,
            MIN(p.min_stock) as reorderLevel
        FROM {$products_table} p
        LEFT JOIN {$categories_table} c ON p.category_id = c.id
        LEFT JOIN (
            SELECT 
                p2.category_id,
                SUM(si.quantity) as sold
            FROM {$sale_items_table} si
            JOIN {$sales_table} s ON si.sale_id = s.id
            JOIN {$products_table} p2 ON si.product_id = p2.id
            WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND s.status = 'completed'
            GROUP BY p2.category_id
        ) sold_data ON p.category_id = sold_data.category_id
        WHERE p.status = 'active'
        GROUP BY c.id, c.name
        ORDER BY c.name
    ";
    
    $results = $wpdb->get_results($query);
    
    if ($wpdb->last_error) {
        return new WP_Error('database_error', $wpdb->last_error, array('status' => 500));
    }
    
    $data = array();
    foreach ($results as $row) {
        $data[] = array(
            'category' => $row->category ?: 'Uncategorized',
            'stock' => floatval($row->stock), // Fixed: Use floatval for decimal stock values
            'sold' => floatval($row->sold), // Fixed: Use floatval for decimal quantities
            'reorderLevel' => floatval($row->reorderLevel) // Fixed: Use floatval for decimal values
        );
    }
    
    return array(
        'success' => true,
        'data' => $data
    );
}
