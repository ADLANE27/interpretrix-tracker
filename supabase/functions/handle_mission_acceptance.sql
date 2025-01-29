CREATE OR REPLACE FUNCTION handle_mission_acceptance(p_mission_id UUID, p_interpreter_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mettre à jour la mission
  UPDATE interpretation_missions
  SET 
    status = 'accepted',
    assigned_interpreter_id = p_interpreter_id,
    assignment_time = NOW(),
    notified_interpreters = '{}'::uuid[]
  WHERE id = p_mission_id
  AND status = 'awaiting_acceptance';

  -- Mettre à jour le statut de l'interprète
  UPDATE interpreter_profiles
  SET status = 'busy'
  WHERE id = p_interpreter_id
  AND status = 'available';

  -- Annuler les autres notifications pour cet interprète
  UPDATE mission_notifications
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE interpreter_id = p_interpreter_id
  AND mission_id != p_mission_id
  AND status = 'pending';

  -- Mettre à jour la notification acceptée
  UPDATE mission_notifications
  SET 
    status = 'accepted',
    updated_at = NOW()
  WHERE mission_id = p_mission_id
  AND interpreter_id = p_interpreter_id;
END;
$$;