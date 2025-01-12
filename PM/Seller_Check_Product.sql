SET @seller_id = 1;

SELECT *
FROM products
where seller_id = @seller_id
order by created_at desc;