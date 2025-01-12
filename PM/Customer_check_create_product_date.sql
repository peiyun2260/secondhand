SELECT * 
FROM products
where created_at >= date_sub(curdate(), interval 7 day)
AND status = 'listed'
order by created_at desc;

SELECT * 
FROM products
where created_at >= date_sub(curdate(), interval 1 month)
AND status = 'listed'
order by created_at desc;

SELECT * 
FROM products
where created_at >= date_sub(curdate(), interval 3 month)
AND status = 'listed'
order by created_at desc;

SELECT * 
FROM products
where created_at >= date_sub(curdate(), interval 6 month)
AND status = 'listed'
order by created_at desc;

SELECT * 
FROM products
where created_at >= date_sub(curdate(), interval 1 year)
AND status = 'listed'
order by created_at desc;