import { supabase } from '../supabaseClient';

const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

export const fetchProjects = async () => {
  const userId = await getCurrentUserId();
  let query = supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchTasksByProject = async (projectId) => {
  const userId = await getCurrentUserId();
  let query = supabase.from('workbook').select('*').eq('project_id', projectId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchPhasesByProject = async (projectId) => {
  const userId = await getCurrentUserId();
  let query = supabase.from('phases').select('*').eq('project_id', projectId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const createProject = async (projectData) => {
  const userId = await getCurrentUserId();
  const insertData = userId ? { ...projectData, user_id: userId } : projectData;
  
  const { data, error } = await supabase.from('projects').insert([insertData]).select();
  if (error) throw error;
  return data ? data[0] : null;
};

export const updateProject = async (id, projectData) => {
  const { data, error } = await supabase.from('projects').update(projectData).eq('id', id).select();
  if (error) throw error;
  return data ? data[0] : null;
};

export const deleteProject = async (id) => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const fetchDevelopers = async () => {
  const userId = await getCurrentUserId();
  let query = supabase.from('developers').select('*');
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const createDeveloper = async (devData) => {
  const userId = await getCurrentUserId();
  const insertData = userId ? { ...devData, user_id: userId } : devData;

  const { data, error } = await supabase.from('developers').insert([insertData]).select();
  if (error) throw error;
  return data ? data[0] : null;
};

export const updateDeveloper = async (id, devData) => {
  const { data, error } = await supabase.from('developers').update(devData).eq('id', id).select();
  if (error) throw error;
  return data ? data[0] : null;
};

export const deleteDeveloper = async (id) => {
  const { error } = await supabase.from('developers').delete().eq('id', id);
  if (error) throw error;
  return true;
};