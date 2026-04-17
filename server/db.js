import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.");
  console.error("Please add them in the Render Dashboard -> Environment tab.");
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Users API
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('id, username, role');
  if (error) throw error;
  return data;
};

export const getUserByUsername = async (username) => {
  const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
  return data;
};

export const createUser = async (username, password, role) => {
  const { data, error } = await supabase.from('users').insert([{ username, password, role }]).select().single();
  if (error) throw error;
  return data;
};

// Articles API
export const getArticles = async () => {
  const { data, error } = await supabase.from('articles').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data;
};

export const getArticleById = async (id) => {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createArticle = async (id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit) => {
  const { data, error } = await supabase.from('articles').insert([{
    id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit
  }]).select().single();
  if (error) throw error;
  return data;
};

export const updateArticle = async (id, category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime) => {
  const { data, error } = await supabase.from('articles').update({
    category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteArticle = async (id) => {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
};

export const incrementArticleViews = async (id) => {
  const { data: article } = await supabase.from('articles').select('views').eq('id', id).single();
  const newViews = (article?.views || 0) + 1;
  const { error } = await supabase.from('articles').update({ views: newViews }).eq('id', id);
  if (error) throw error;
};

export const getPopularArticles = async (limit) => {
  const { data, error } = await supabase.from('articles').select('*').order('views', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
};

// Settings API
export const getSetting = async (key) => {
  const { data, error } = await supabase.from('settings').select('*').eq('key', key).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const upsertSetting = async (key, value) => {
  const { error } = await supabase.from('settings').upsert({ key, value });
  if (error) throw error;
};
