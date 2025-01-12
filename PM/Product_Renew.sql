SET @product_id = 3;                  -- 必須設置
SET @product_name = '更新手機';        -- 設定新值
SET @product_description = NULL;      -- 設為 NULL 表示不更新
SET @product_category = '電子產品';  -- 設定新值
SET @product_price = 8500;            -- 設定新值
SET @product_stock = 10;              -- 設定庫存數量
SET @product_status = 'sold';         -- 設定狀態

UPDATE products
SET 
    name = COALESCE(@product_name, name),
    description = COALESCE(@product_description, description),
    category = COALESCE(@product_category, category),
    price = COALESCE(@product_price, price),
    stock_quantity = COALESCE(@product_stock, stock_quantity),
    status = COALESCE(@product_status, status)
WHERE product_id = @product_id;



	



