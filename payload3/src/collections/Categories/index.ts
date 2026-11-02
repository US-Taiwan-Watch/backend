import { CollectionConfig } from "payload";
import { generateCategoryConfig } from "./Categories";

export const CategoriesBill: CollectionConfig = generateCategoryConfig('categories-bill', 'Category - Bill');
export const CategoriesArticle: CollectionConfig = generateCategoryConfig('categories-article', 'Category - Article');
export const CategoriesKetagalan: CollectionConfig = generateCategoryConfig('categories-ketagalan', 'Category - Ketagalan');
export const CategoriesPeople: CollectionConfig = generateCategoryConfig('categories-people', 'Category - People');
