declare module 'react-organizational-chart' {
  import type * as React from 'react';

  export interface TreeProps {
    label: React.ReactNode;
    children?: React.ReactNode;
    lineClassName?: string;
    lineBorder?: string;
    lineColor?: string;
    lineHeight?: string;
    nodePadding?: string;
  }

  export const Tree: React.FC<TreeProps>;

  export interface TreeNodeProps {
    label: React.ReactNode;
    children?: React.ReactNode;
  }

  export const TreeNode: React.FC<TreeNodeProps>;
}
