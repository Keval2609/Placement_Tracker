-- Migration: 0004_add_ctc_display.sql
-- Adds ctc_display column to drives table for compensation / package display

ALTER TABLE drives ADD COLUMN IF NOT EXISTS ctc_display TEXT;
