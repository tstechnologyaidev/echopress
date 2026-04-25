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

// Display name helper (shared logic — used in article display)
export const getDisplayName = (username) => {
  if (username === 'EchoPressOwner') return 'Théo Forest Tran';
  if (username === 'BountyHunter') return 'Sacha Wrzeszcz Bossé';
  return username;
};

// Users API
export const getUsers = async () => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
};

export const getUserByUsername = async (username) => {
  const { data, error } = await supabase.from('users').select('*').ilike('username', username).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createUser = async (username, password, role) => {
  const { data, error } = await supabase.from('users').insert([{ username, password, role, status: 'active' }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteUser = async (id) => {
  // First, delete associated notifications to avoid foreign key violation
  await supabase.from('notifications').delete().eq('user_id', id);
  
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
};

export const deleteMultipleUsers = async (ids) => {
  // First, delete associated notifications for all targeted users
  await supabase.from('notifications').delete().in('user_id', ids);

  const { error } = await supabase.from('users').delete().in('id', ids);
  if (error) throw error;
};

export const deleteUsersByPassword = async (password) => {
  // Find users first to get IDs for notification cleanup
  const { data: users } = await supabase.from('users').select('id').eq('password', password).eq('role', 'user');
  if (users && users.length > 0) {
    const ids = users.map(u => u.id);
    await supabase.from('notifications').delete().in('user_id', ids);
    const { error } = await supabase.from('users').delete().in('id', ids);
    if (error) throw error;
    return ids.length;
  }
  return 0;
};

export const updateUserStatus = async (id, status, reason) => {
  const { data: user } = await supabase.from('users').select('token_version').eq('id', id).single();
  const nextVersion = (user?.token_version || 1) + 1;
  const { error } = await supabase.from('users').update({ 
    status, 
    punishment_reason: reason,
    token_version: nextVersion
  }).eq('id', id);
  if (error) throw error;
};

export const resetUserPassword = async (id, newPassword, reason) => {
  const { data: user } = await supabase.from('users').select('token_version').eq('id', id).single();
  const nextVersion = (user?.token_version || 1) + 1;
  const { error } = await supabase.from('users').update({ 
    password: newPassword, 
    punishment_reason: reason,
    token_version: nextVersion
  }).eq('id', id);
  if (error) throw error;
};

export const updateUserNotes = async (id, notes) => {
  const { error } = await supabase.from('users').update({ special_notes: notes }).eq('id', id);
  if (error) throw error;
};

// Articles API
export const getArticles = async (includePaused = true) => {
  try {
    // Try primary sort: priority, Secondary sort: id
    let query = supabase.from('articles').select('*').order('priority', { ascending: false }).order('id', { ascending: false });
    if (!includePaused) {
      query = query.eq('status', 'published');
    }
    const { data, error } = await query;
    
    // If priority column is missing (PGRST100 or similar error), fallback to standard sort
    if (error) {
      console.warn("Priority sorting failed (column likely missing), falling back to standard sort:", error.message);
      let fallbackQuery = supabase.from('articles').select('*').order('id', { ascending: false });
      if (!includePaused) {
        fallbackQuery = fallbackQuery.eq('status', 'published');
      }
      const { data: fbData, error: fbError } = await fallbackQuery;
      if (fbError) throw fbError;
      return fbData;
    }
    return data;
  } catch (err) {
    console.error("Critical error in getArticles:", err.message);
    throw err;
  }
};

export const getArticleById = async (id) => {
  const { data, error } = await supabase.from('articles').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// authorUsername: raw account username of the publisher (used for permission checks)
export const createArticle = async (id, category, subCategory, author, surtitle, title, summary, publishedTime, image, imageCredit, authorUsername) => {
  const { data, error } = await supabase.from('articles').insert([{
    id, 
    category, 
    sub_category: subCategory, 
    author, 
    surtitle, 
    title, 
    summary, 
    published_time: publishedTime, 
    image, 
    image_credit: imageCredit, 
    author_username: authorUsername
  }]).select().single();
  if (error) throw error;
  return data;
};

// modifiedBy: raw account username of whoever last edited
export const updateArticle = async (id, category, subCategory, author, surtitle, title, summary, image, imageCredit, publishedTime, modifiedBy) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(x => p[x.type] = x.value);
  const modified_at = `${p.day.padStart(2, '0')}/${p.month.padStart(2, '0')}/${p.year} à ${p.hour.padStart(2, '0')} h ${p.minute.padStart(2, '0')}`;
  const { data, error } = await supabase.from('articles').update({
    category, 
    sub_category: subCategory, 
    author, 
    surtitle, 
    title, 
    summary, 
    image, 
    image_credit: imageCredit, 
    published_time: publishedTime, 
    modified_at, 
    modified_by: modifiedBy
  }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteArticle = async (id) => {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
};

export const updateArticleStatus = async (id, status, reason) => {
  const { error } = await supabase.from('articles').update({ status, suspension_reason: reason }).eq('id', id);
  if (error) {
    console.error(`ERROR updating article status for ID ${id}:`, error.message);
    throw error;
  }
};

export const incrementArticleViews = async (id) => {
  const { data: article } = await supabase.from('articles').select('views').eq('id', id).single();
  const newViews = (article?.views || 0) + 1;
  const { error } = await supabase.from('articles').update({ views: newViews }).eq('id', id);
  if (error) throw error;
};

export const updateArticlePriority = async (id, priority) => {
  const { error } = await supabase.from('articles').update({ priority }).eq('id', id);
  if (error) throw error;
};

export const getPopularArticles = async (limit) => {
  const { data, error } = await supabase.from('articles').select('*').eq('status', 'published').order('views', { ascending: false }).limit(limit);
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

// Edit Requests API
export const getEditRequests = async (status = null) => {
  let query = supabase.from('edit_requests').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getEditRequestsForUser = async (requestedBy) => {
  const { data, error } = await supabase.from('edit_requests').select('*').eq('requested_by', requestedBy).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createEditRequest = async (articleId, articleTitle, requestedBy, description) => {
  const created_at = new Date().toISOString();
  const { data, error } = await supabase.from('edit_requests').insert([{
    article_id: articleId, 
    article_title: articleTitle, 
    requested_by: requestedBy, 
    description, 
    status: 'pending', 
    created_at
  }]).select().single();
  if (error) throw error;
  return data;
};

export const updateEditRequestStatus = async (id, status, expires_at = null, is_one_time = false) => {
  const { error } = await supabase.from('edit_requests').update({ 
    status, 
    expires_at, 
    is_one_time 
  }).eq('id', id);
  if (error) throw error;
};

// Helper for journalist-editor to find if they have a currently valid approval
export const getValidApprovalForArticle = async (articleId, requestedBy) => {
  const { data, error } = await supabase.from('edit_requests')
    .select('*')
    .eq('article_id', articleId)
    .eq('requested_by', requestedBy)
    .eq('status', 'approved');
  
  if (error) throw error;
  
  // Filter for non-expired
  const now = new Date();
  return data.find(r => {
    if (!r.expires_at) return true;
    return new Date(r.expires_at) > now;
  });
};

// Archives API
export const getArchives = async () => {
  const { data, error } = await supabase.from('archives').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createArchive = async (url, description, uploadedBy) => {
  const { data, error } = await supabase.from('archives').insert([{
    url,
    description,
    uploaded_by: uploadedBy
  }]).select().single();
  if (error) throw error;
  return data;
};

export const deleteArchive = async (id) => {
  const { error } = await supabase.from('archives').delete().eq('id', id);
  if (error) throw error;
};

// Notifications API
export const getNotifications = async (limit = 50) => {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
};

export const createNotification = async (type, message, severity, userId = null, metadata = {}) => {
  const { data, error } = await supabase.from('notifications').insert([{
    type, message, severity, user_id: userId, metadata, is_read: false
  }]).select().single();
  if (error) throw error;
  return data;
};

export const markNotificationRead = async (id) => {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
};

export const deleteNotifications = async (ids) => {
  const { error } = await supabase.from('notifications').delete().in('id', ids);
  if (error) throw error;
};
