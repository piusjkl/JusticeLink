import React from 'react';
import { ReportsSystem } from '@/components/ReportsSystem';
import { useNavigate } from 'react-router-dom';

export default function GovReports() {
  const navigate = useNavigate();
  return (
    <ReportsSystem onBack={() => navigate(-1)} />
  );
}