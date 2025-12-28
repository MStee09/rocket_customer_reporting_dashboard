/*
  # Add maps_to_field Column to Learning Queue

  1. Changes
    - Add `maps_to_field` column to `glossary_learning_queue` table
    - This field captures what database field/query the term maps to
    - Example: "COUNT(*) WHERE status_name='Delivered'" or "destination_state field"

  2. Notes
    - Optional field (nullable) since not all terms map to fields
    - Text field to allow flexible descriptions of field mappings
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'glossary_learning_queue' 
    AND column_name = 'maps_to_field'
  ) THEN
    ALTER TABLE glossary_learning_queue 
    ADD COLUMN maps_to_field TEXT;
    
    COMMENT ON COLUMN glossary_learning_queue.maps_to_field IS 
      'Description of what database field or query pattern this term maps to';
  END IF;
END $$;
