import { supabase } from '../supabaseClient';

export const fetchProjects = async () => {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchTasksByProject = async (projectId) => {
  const { data, error } = await supabase.from('tasks').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data || [];
};

export const fetchPhasesByProject = async (projectId) => {
  const { data, error } = await supabase.from('phases').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data || [];
};

export const createProject = async (projectData) => {
  const { data, error } = await supabase.from('projects').insert([projectData]).select();
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
  const { data, error } = await supabase.from('developers').select('*');
  if (error) throw error;
  return data || [];
};

export const createDeveloper = async (devData) => {
  const { data, error } = await supabase.from('developers').insert([devData]).select();
  if (error) throw error;
  return data ? data[0] : null;
};