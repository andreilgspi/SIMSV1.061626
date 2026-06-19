import { supabase } from '../supabaseClient';

// ========== PROJECTS ==========

export const fetchProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('id', { ascending: true });
  
  if (error) throw error;
  return data;
};

export const createProject = async (project) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{
      name: project.name,
      description: project.description,
      status: project.status || 'On Track',
      start_date: project.start_date,
      end_date: project.end_date
    }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const updateProject = async (id, project) => {
  const { data, error } = await supabase
    .from('projects')
    .update({
      name: project.name,
      description: project.description,
      start_date: project.start_date,
      end_date: project.end_date
    })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deleteProject = async (id) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// ========== TASKS ==========

export const fetchTasksByProject = async (projectId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('id', { ascending: true });
  
  if (error) throw error;
  return data;
};

export const createTask = async (task) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      project_id: task.project_id,
      phase_id: task.phase_id || null,
      task_id: task.task_id,
      task_name: task.task_name,
      start_date: task.start_date,
      end_date: task.end_date,
      predecessors: task.predecessors || '',
      duration: task.duration,
      owner: task.owner,
      percent_complete: task.percent_complete || 0,
      status: task.status || 'Not Started',
      notes: task.notes || '',
      is_milestone: task.is_milestone || 0
    }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const updateTask = async (id, task) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      task_name: task.task_name,
      start_date: task.start_date,
      end_date: task.end_date,
      predecessors: task.predecessors,
      duration: task.duration,
      owner: task.owner,
      percent_complete: task.percent_complete,
      status: task.status,
      notes: task.notes,
      is_milestone: task.is_milestone,
      phase_id: task.phase_id
    })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deleteTask = async (id) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// ========== PHASES ==========

export const fetchPhasesByProject = async (projectId) => {
  const { data, error } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', projectId)
    .order('id', { ascending: true });
  
  if (error) throw error;
  return data;
};

export const createPhase = async (phase) => {
  const { data, error } = await supabase
    .from('phases')
    .insert([{
      project_id: phase.project_id,
      name: phase.name
    }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const updatePhase = async (id, phase) => {
  const { data, error } = await supabase
    .from('phases')
    .update({
      name: phase.name
    })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deletePhase = async (id) => {
  const { error } = await supabase
    .from('phases')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// ========== DEVELOPERS ==========

export const fetchDevelopers = async () => {
  const { data, error } = await supabase
    .from('developers')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data;
};

export const createDeveloper = async (developer) => {
  const { data, error } = await supabase
    .from('developers')
    .insert([{
      name: developer.name,
      email: developer.email || '',
      role: developer.role || '',
      avatar: developer.avatar || null
    }])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const updateDeveloper = async (id, developer) => {
  const { data, error } = await supabase
    .from('developers')
    .update({
      name: developer.name,
      email: developer.email,
      role: developer.role,
      avatar: developer.avatar
    })
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deleteDeveloper = async (id) => {
  const { error } = await supabase
    .from('developers')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
};

// ========== DATA MIGRATION HELPERS ==========

/**
 * Migrate SQLite data to Supabase
 * Run this once to copy your local data to Supabase
 */
export const migrateData = async (localData) => {
  const results = { success: [], errors: [] };

  // Migrate projects
  for (const project of localData.projects || []) {
    try {
      await createProject(project);
      results.success.push(`Project: ${project.name}`);
    } catch (error) {
      results.errors.push(`Project ${project.name}: ${error.message}`);
    }
  }

  // Migrate developers
  for (const developer of localData.developers || []) {
    try {
      await createDeveloper(developer);
      results.success.push(`Developer: ${developer.name}`);
    } catch (error) {
      results.errors.push(`Developer ${developer.name}: ${error.message}`);
    }
  }

  // Migrate phases
  for (const phase of localData.phases || []) {
    try {
      await createPhase(phase);
      results.success.push(`Phase: ${phase.name}`);
    } catch (error) {
      results.errors.push(`Phase ${phase.name}: ${error.message}`);
    }
  }

  // Migrate tasks
  for (const task of localData.tasks || []) {
    try {
      await createTask(task);
      results.success.push(`Task: ${task.task_name}`);
    } catch (error) {
      results.errors.push(`Task ${task.task_name}: ${error.message}`);
    }
  }

  return results;
};