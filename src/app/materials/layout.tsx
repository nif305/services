import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

export default function MaterialsLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell workspace="materials">{children}</WorkspaceShell>;
}
