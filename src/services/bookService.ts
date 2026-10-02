import { supabase } from "./supabase";
import type { Book } from "../types";

/**
 * Convert a Supabase books row into the application's Book type.
 *
 * Supabase:
 *   cover_url
 *   availability_status
 *
 * App:
 *   coverUrl
 *   availabilityStatus
 */
function mapBook(row: any): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    category: row.category,
    description: row.description ?? undefined,
    edition: row.edition ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    availabilityStatus: row.availability_status,
  };
}

/**
 * FR01 — Search books by title or author.
 */
export async function searchBooks(
  query: string
): Promise<Book[]> {
  const searchQuery = query.trim();

  if (!searchQuery) {
    return getCatalogue();
  }

  const { data, error } = await supabase
    .from("books")
    .select("*")
    .or(
      `title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`
    )
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBook);
}

/**
 * Browse the full catalogue.
 *
 * Optionally filters books by category.
 */
export async function getCatalogue(
  category?: string
): Promise<Book[]> {
  let query = supabase
    .from("books")
    .select("*")
    .order("title", { ascending: true });

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBook);
}

/**
 * FR02 — Get one book by ID.
 */
export async function getBookById(
  bookId: string
): Promise<Book> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (error) {
    throw error;
  }

  return mapBook(data);
}