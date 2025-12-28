/*
  # Drop All Existing Tables

  This migration removes all existing tables to start fresh with a clean schema.
*/

DROP TABLE IF EXISTS shipment_document CASCADE;
DROP TABLE IF EXISTS shipment_address CASCADE;
DROP TABLE IF EXISTS shipment CASCADE;
DROP TABLE IF EXISTS shipment_status CASCADE;
DROP TABLE IF EXISTS shipment_mode CASCADE;
DROP TABLE IF EXISTS equipment_type CASCADE;
DROP TABLE IF EXISTS carrier CASCADE;
DROP TABLE IF EXISTS users_customers CASCADE;
DROP TABLE IF EXISTS pending_user_invites CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role CASCADE;
