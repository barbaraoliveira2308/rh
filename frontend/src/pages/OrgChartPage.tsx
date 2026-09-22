import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tree, TreeNode } from 'react-organizational-chart';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SearchField } from '@/components/SearchField';
import { Card, CardContent } from '@/components/ui/card';
import { fetchOrgChart } from '@/api/users.api';
import type { OrgChartNode } from '@/types/users';
import { cn } from '@/lib/utils';

function matchesSearch(node: OrgChartNode, term: string): boolean {
  if (!term) {
    return false;
  }
  const normalized = term.toLowerCase();
  const values = [node.firstName, node.lastName, node.email, node.jobTitle, node.department].filter(
    (value): value is string => value !== null,
  );
  return values.some((value) => value.toLowerCase().includes(normalized));
}

interface OrgChartNodeCardProps {
  node: OrgChartNode;
  highlighted: boolean;
}

function OrgChartNodeCard({ node, highlighted }: OrgChartNodeCardProps): React.JSX.Element {
  return (
    <Card className={cn('w-60', highlighted && 'border-brand-800 bg-brand-50')}>
      <CardContent className="space-y-1 p-4">
        <p className="truncate font-semibold">
          {node.firstName} {node.lastName}
        </p>
        <p className="truncate text-sm text-muted-foreground">{node.jobTitle ?? '-'}</p>
        <p className="truncate text-sm text-muted-foreground">{node.department ?? '-'}</p>
        <p className="truncate text-xs text-muted-foreground">{node.email}</p>
      </CardContent>
    </Card>
  );
}

function renderNode(node: OrgChartNode, searchTerm: string): React.JSX.Element {
  const highlighted = matchesSearch(node, searchTerm);
  return (
    <TreeNode key={node.id} label={<OrgChartNodeCard node={node} highlighted={highlighted} />}>
      {node.children.map((child) => renderNode(child, searchTerm))}
    </TreeNode>
  );
}

export function OrgChartPage(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['orgChart'],
    queryFn: () => fetchOrgChart(),
  });

  return (
    <div>
      <PageHeader title="Organograma" description="Estrutura hierárquica da organização" />

      <div className="mb-6 max-w-md">
        <SearchField
          placeholder="Pesquisar colaborador..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {error && <p className="text-sm text-red-600">Erro ao carregar organograma.</p>}

      {data && (
        <div className="overflow-x-auto pb-8">
          {data.map((node) => (
            <Tree
              key={node.id}
              label={<OrgChartNodeCard node={node} highlighted={matchesSearch(node, searchTerm)} />}
            >
              {node.children.map((child) => renderNode(child, searchTerm))}
            </Tree>
          ))}
        </div>
      )}
    </div>
  );
}
