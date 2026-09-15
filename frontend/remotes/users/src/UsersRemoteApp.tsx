import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { OrgChartPage } from '@/pages/OrgChartPage';
import { UserDetailPage } from '@/pages/UserDetailPage';
import { UserNewPage } from '@/pages/UserNewPage';
import { UsersListPage } from '@/pages/UsersListPage';

export function UsersRemoteApp(): React.JSX.Element {
  return (
    <Routes>
      <Route index element={<UsersListPage />} />
      <Route path="new" element={<UserNewPage />} />
      <Route path="org-chart" element={<OrgChartPage />} />
      <Route path=":id" element={<UserDetailPage />} />
      <Route path="*" element={<Navigate to="/users" replace />} />
    </Routes>
  );
}
