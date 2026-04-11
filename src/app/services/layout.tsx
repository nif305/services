import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell workspace="services">{children}</WorkspaceShell>;
}
