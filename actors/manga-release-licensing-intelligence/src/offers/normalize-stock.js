export const normalizeStockStatus = (value, availability = '') => {
    const text = `${value ?? ''} ${availability ?? ''}`.toLocaleLowerCase('vi-VN');
    if (/pre.?order|đặt trước|sắp phát hành/.test(text)) return 'preorder';
    if (/outofstock|out of stock|sold out|temporarily unavailable|currently unavailable|unavailable|hết hàng|tạm hết/.test(text)) return 'outOfStock';
    if (/backorder|đang nhập/.test(text)) return 'backorder';
    if (/discontinued|ngừng phát hành/.test(text)) return 'discontinued';
    if (/instock|in stock|disponível|disponivel|còn hàng|sẵn hàng/.test(text)) return 'inStock';
    return 'unknown';
};
