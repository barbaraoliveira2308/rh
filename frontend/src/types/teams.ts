export interface EmployeeTeamMembership {
  id: string;
  startDate: string;
  roleInTeam: string | null;
  team: {
    id: string;
    name: string;
    department?: { id: string; name: string } | null;
    leader?: { id: string; firstName: string; lastName: string } | null;
  };
}
