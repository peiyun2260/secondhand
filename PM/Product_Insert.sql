SET @product_name = '手機';
SET @product_description = '全新未開封';
SET @product_category = '電子產品';
#SET @image_urls = 'url1,url2,url3';
SET @product_price = 12000;
SET @product_stock = 5;
SET @seller_id = 1;
SET @product_status = 'listed';

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO products (name, description, category, price, stock_quantity, seller_id, status)
VALUES (@product_name, @product_description, @product_category, 
	@product_price, @product_stock, @seller_id, @product_status);