import type { Product } from '../types';

export function getProductSalePrice(product: Product) {
  return product.flashSalePrice || product.discountPrice;
}

export function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')}đ`;
}
