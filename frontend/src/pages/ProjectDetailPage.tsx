import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoCard, InfoRow, InfoLink } from '@/components/projects/InfoCard';
import {
  DatesTab,
  DocumentsTab,
  EstimatesTab,
  PaymentsTab,
  TasksTab,
  NotesTab,
} from '@/components/projects/tabs';
import {
  EditJobModal,
  AddEstimateModal,
  EstimateViewerModal,
  RecordPaymentModal,
  AddContactModal,
} from '@/components/projects/modals';
import {
  ArrowLeft,
  Phone,
  Mail,
  Pencil,
  Plus,
  ChevronDown,
  Droplets,
  Flame,
  AlertTriangle,
  Building,
  Calendar,
  FolderOpen,
  FileText,
  DollarSign,
  CheckSquare,
  MessageSquare,
  User,
} from 'lucide-react';
import {
  useProject,
  useUpdateProjectStatus,
  useCreateNote,
  useUpdateEstimate,
  type ProjectContact,
  type Estimate,
} from '@/hooks/useProjects';
import { useState } from 'react';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    lead: 'bg-blue-100 text-blue-800',
    complete: 'bg-gray-100 text-gray-800',
    closed: 'bg-gray-200 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Damage source icon
function getDamageIcon(source?: string) {
  const s = source?.toLowerCase() || '';
  if (s.includes('water') || s.includes('sewage') || s.includes('flood')) {
    return <Droplets className="h-6 w-6 text-blue-500" />;
  }
  if (s.includes('fire') || s.includes('smoke')) {
    return <Flame className="h-6 w-6 text-orange-500" />;
  }
  if (s.includes('mold')) {
    return <AlertTriangle className="h-6 w-6 text-green-600" />;
  }
  return <Building className="h-6 w-6 text-gray-500" />;
}

// Contact card for the contacts section
function ContactCard({ contact }: { contact: ProjectContact }) {
  return (
    <div className="flex items-start justify-between p-3 border rounded-lg">
      <div>
        <p className="font-medium">
          {contact.first_name} {contact.last_name}
          {contact.role_on_project && (
            <span className="text-muted-foreground font-normal"> ({contact.role_on_project})</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {contact.organization_name || 'No organization'}
        </p>
      </div>
      <div className="flex gap-2">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="p-1.5 rounded hover:bg-muted">
            <Phone className="h-4 w-4 text-muted-foreground" />
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="p-1.5 rounded hover:bg-muted">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0', 10);
  const { data: project, isLoading, error } = useProject(projectId);
  const updateStatus = useUpdateProjectStatus();
  const createNote = useCreateNote();
  const updateEstimate = useUpdateEstimate();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddEstimateModal, setShowAddEstimateModal] = useState(false);
  const [revisionEstimate, setRevisionEstimate] = useState<Estimate | null>(null);
  const [viewingEstimate, setViewingEstimate] = useState<Estimate | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: projectId, status: newStatus });
    setShowStatusMenu(false);
  };

  const handleAddNote = (content: string, noteType?: string, subject?: string) => {
    createNote.mutate({ projectId, content, noteType, subject });
  };

  const handleApproveEstimate = (estimate: Estimate) => {
    updateEstimate.mutate({
      projectId,
      estimateId: estimate.id,
      data: {
        status: 'approved',
        approved_date: new Date().toISOString().split('T')[0],
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-destructive">Error loading project</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        {/* Back link */}
        <Link
          to="/jobs"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Jobs
        </Link>

        {/* Header Card */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getDamageIcon(project.damage_source)}
              <div>
                <h1 className="text-xl font-bold">{project.job_number}</h1>
                <p className="text-lg">{project.client_name || 'No client assigned'}</p>
                <p className="text-muted-foreground">
                  {project.address}, {project.city}, {project.state} {project.zip}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                >
                  <StatusBadge status={project.status} />
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                    {['lead', 'pending', 'active', 'complete', 'closed', 'cancelled'].map((status) => (
                      <button
                        key={status}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => handleStatusChange(status)}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Client Card */}
          <InfoCard title="Client">
            {project.client ? (
              <>
                <p className="font-medium">{project.client.name}</p>
                {project.client.phone && (
                  <InfoLink href={`tel:${project.client.phone}`} icon={<Phone className="h-3 w-3" />}>
                    {project.client.phone}
                  </InfoLink>
                )}
                {project.client.email && (
                  <InfoLink href={`mailto:${project.client.email}`} icon={<Mail className="h-3 w-3" />}>
                    {project.client.email}
                  </InfoLink>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No client assigned</p>
            )}
          </InfoCard>

          {/* Insurance Card */}
          <InfoCard title="Insurance">
            {project.carrier ? (
              <>
                <p className="font-medium">{project.carrier.name}</p>
                {project.claim_number && <InfoRow label="Claim">{project.claim_number}</InfoRow>}
                {project.policy_number && <InfoRow label="Policy">{project.policy_number}</InfoRow>}
                {project.deductible && (
                  <InfoRow label="Deductible">
                    ${project.deductible.toLocaleString()}
                  </InfoRow>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No insurance carrier</p>
            )}
          </InfoCard>

          {/* Property Card */}
          <InfoCard title="Property">
            <p className="font-medium">
              {project.structure_type || 'Unknown'}
              {project.square_footage && ` | ${project.square_footage.toLocaleString()} sqft`}
            </p>
            {project.year_built && <InfoRow label="Built">{project.year_built}</InfoRow>}
            <div className="flex gap-4 text-sm">
              {project.damage_category && (
                <span className="text-muted-foreground">
                  Cat {project.damage_category}
                </span>
              )}
              {project.damage_class && (
                <span className="text-muted-foreground">
                  Class {project.damage_class}
                </span>
              )}
            </div>
            <InfoRow label="Source">{project.damage_source || 'Unknown'}</InfoRow>
          </InfoCard>
        </div>

        {/* Main Tabbed Action Card */}
        <div className="border rounded-lg bg-card">
          <Tabs defaultValue="dates">
            <div className="border-b px-4 pt-2">
              <TabsList className="bg-transparent gap-1">
                <TabsTrigger value="dates" className="gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Dates
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5">
                  <FolderOpen className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="estimates" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  Estimates
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-1.5">
                  <CheckSquare className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dates" className="m-0">
              <DatesTab project={project} />
            </TabsContent>

            <TabsContent value="documents" className="m-0">
              <DocumentsTab projectId={projectId} media={project.media || []} />
            </TabsContent>

            <TabsContent value="estimates" className="m-0">
              <EstimatesTab
                estimates={project.estimates || []}
                onAddEstimate={() => setShowAddEstimateModal(true)}
                onAddRevision={(estimate) => {
                  setRevisionEstimate(estimate);
                  setShowAddEstimateModal(true);
                }}
                onViewEstimate={(estimate) => setViewingEstimate(estimate)}
                onApproveEstimate={handleApproveEstimate}
              />
            </TabsContent>

            <TabsContent value="payments" className="m-0">
              <PaymentsTab
                payments={project.payments || []}
                onAddPayment={() => setShowRecordPaymentModal(true)}
              />
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <TasksTab projectId={projectId} />
            </TabsContent>

            <TabsContent value="notes" className="m-0">
              <NotesTab
                notes={project.notes || []}
                onAddNote={handleAddNote}
                isAddingNote={createNote.isPending}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Contacts Card (Always visible) */}
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Assigned Contacts</h3>
              <span className="text-sm text-muted-foreground">
                ({project.contacts?.length || 0})
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddContactModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Contact
            </Button>
          </div>
          {project.contacts?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {project.contacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts assigned to this project</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditJobModal job={project} onClose={() => setShowEditModal(false)} />
      )}

      {showAddEstimateModal && (
        <AddEstimateModal
          projectId={projectId}
          existingEstimates={project.estimates || []}
          revisionOf={revisionEstimate || undefined}
          onClose={() => {
            setShowAddEstimateModal(false);
            setRevisionEstimate(null);
          }}
        />
      )}

      {showRecordPaymentModal && (
        <RecordPaymentModal
          projectId={projectId}
          estimates={project.estimates || []}
          onClose={() => setShowRecordPaymentModal(false)}
        />
      )}

      {showAddContactModal && (
        <AddContactModal
          projectId={projectId}
          existingContactIds={project.contacts?.map((c) => c.id) || []}
          onClose={() => setShowAddContactModal(false)}
        />
      )}

      {viewingEstimate && (
        <EstimateViewerModal
          estimate={viewingEstimate}
          onClose={() => setViewingEstimate(null)}
        />
      )}
    </div>
  );
}
