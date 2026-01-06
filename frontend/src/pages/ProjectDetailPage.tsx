import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoCard, InfoRow, InfoLink } from '@/components/projects/InfoCard';
import {
  DatesTab,
  DocumentsTab,
  TasksTab,
  NotesTab,
  ExpensesTab,
} from '@/components/projects/tabs';
import { DryingTab } from '@/components/drying';
import {
  EditJobModal,
  AddEstimateModal,
  EstimateViewerModal,
  RecordPaymentModal,
  AddContactModal,
  LaborEntryModal,
  ReceiptModal,
  WorkOrderModal,
} from '@/components/projects/modals';
import { AccountingModule } from '@/components/projects/accounting';
import { EventViewer } from '@/components/projects/events';
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
  CheckSquare,
  MessageSquare,
  User,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import {
  useProject,
  useUpdateProjectStatus,
  useCreateNote,
  useActivityLog,
  useToggleReadyToInvoice,
  type ProjectContact,
  type Estimate,
  type LaborEntry,
  type Receipt,
  type WorkOrder,
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
    <div className="flex items-start justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors">
      <div>
        <p className="font-medium text-foreground">
          {contact.first_name} {contact.last_name}
          {contact.role_on_project && (
            <span className="text-muted-foreground font-normal"> ({contact.role_on_project})</span>
          )}
          {contact.has_msa && (
            <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded-full">
              MSA
            </span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {contact.organization_name || 'No organization'}
        </p>
      </div>
      <div className="flex gap-2">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors">
            <Phone className="h-4 w-4" />
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors">
            <Mail className="h-4 w-4" />
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
  const { data: activityData, isLoading: activityLoading } = useActivityLog(projectId);
  const toggleReadyToInvoice = useToggleReadyToInvoice();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddEstimateModal, setShowAddEstimateModal] = useState(false);
  const [revisionEstimate, setRevisionEstimate] = useState<Estimate | null>(null);
  const [viewingEstimate, setViewingEstimate] = useState<Estimate | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showLaborModal, setShowLaborModal] = useState(false);
  const [editingLabor, setEditingLabor] = useState<LaborEntry | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: projectId, status: newStatus });
    setShowStatusMenu(false);
  };

  const handleAddNote = (content: string, noteType?: string, subject?: string) => {
    createNote.mutate({ projectId, content, noteType, subject });
  };

  const handleToggleReadyToInvoice = () => {
    toggleReadyToInvoice.mutate({
      projectId,
      ready: !project?.ready_to_invoice,
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

  // Filter contacts who are adjusters (primary, TPA, or role contains "adjuster")
  const adjusters = (project.contacts || []).filter(c =>
    c.is_primary_adjuster || c.is_tpa || c.role_on_project?.toLowerCase().includes('adjuster')
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Back link */}
        <Link
          to="/jobs"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Jobs
        </Link>

        {/* Main Grid Layout: Content (2 cols) + Sidebar (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header Card */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    {getDamageIcon(project.damage_source)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">{project.job_number}</h1>
                    <p className="text-lg font-medium text-foreground/90">{project.client_name || 'No client assigned'}</p>
                    <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Building className="h-3.5 w-3.5" />
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
                      className="bg-transparent border-white/10 hover:bg-white/5"
                    >
                      <StatusBadge status={project.status} />
                      <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
                    </Button>
                    {showStatusMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl py-1 z-10 min-w-[160px] overflow-hidden backdrop-blur-xl">
                        {['lead', 'pending', 'active', 'complete', 'closed', 'cancelled'].map((status) => (
                          <button
                            key={status}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 text-foreground transition-colors"
                            onClick={() => handleStatusChange(status)}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowEditModal(true)}
                    className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                  >
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
                    <p className="font-medium text-foreground">{project.client.name}</p>
                    {project.client.phone && (
                      <InfoLink href={`tel:${project.client.phone}`} icon={<Phone className="h-3 w-3" />}>
                        {project.client.phone}
                      </InfoLink>
                    )}
                    {project.client.email && (
                      <InfoLink href={`mailto:${project.client.email}`} icon={<Mail className="h-3 w-3" />} className="truncate">
                        {project.client.email}
                      </InfoLink>
                    )}
                    {project.client.address && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.client.address}
                        {(project.client.city || project.client.state || project.client.zip) && <br />}
                        {[project.client.city, project.client.state].filter(Boolean).join(', ')} {project.client.zip}
                      </p>
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
                    {project.deductible != null && (
                      <InfoRow label="Deductible">
                        ${project.deductible.toLocaleString()}
                      </InfoRow>
                    )}
                    {/* Adjusters */}
                    {adjusters.length > 0 && (
                      <div className="mt-2 pt-2 border-t space-y-2">
                        <p className="text-xs text-muted-foreground uppercase">
                          Adjuster{adjusters.length > 1 ? 's' : ''}
                        </p>
                        {adjusters.map(adj => (
                          <div key={adj.id} className="text-sm">
                            <p className="font-medium">
                              {adj.first_name} {adj.last_name}
                              {adj.is_primary_adjuster && (
                                <span className="ml-1 text-xs text-green-600">(Primary)</span>
                              )}
                              {adj.is_tpa && (
                                <span className="ml-1 text-xs text-purple-600">(TPA)</span>
                              )}
                            </p>
                            {adj.phone && (
                              <InfoLink href={`tel:${adj.phone}`} icon={<Phone className="h-3 w-3" />}>
                                {adj.phone}
                              </InfoLink>
                            )}
                            {adj.email && (
                              <InfoLink href={`mailto:${adj.email}`} icon={<Mail className="h-3 w-3" />} className="truncate">
                                {adj.email}
                              </InfoLink>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No insurance carrier</p>
                )}
              </InfoCard>

              {/* Property Card */}
              <InfoCard title="Property">
                {project.address && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {project.address}
                    {(project.city || project.state || project.zip) && <br />}
                    {[project.city, project.state].filter(Boolean).join(', ')} {project.zip}
                  </p>
                )}
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
            <div className="glass-card overflow-hidden">
              <Tabs defaultValue="dates">
                <div className="border-b border-white/5 px-4 pt-2">
                  <TabsList className="bg-transparent gap-1">
                    <TabsTrigger value="dates" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                      <Calendar className="h-4 w-4" />
                      Dates
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                      <FolderOpen className="h-4 w-4" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                      <CheckSquare className="h-4 w-4" />
                      Tasks
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                      <MessageSquare className="h-4 w-4" />
                      Notes
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                      <ReceiptIcon className="h-4 w-4" />
                      Expenses
                    </TabsTrigger>
                    <TabsTrigger value="drying" className="gap-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                      <Droplets className="h-4 w-4" />
                      Drying
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="dates" className="m-0 bg-transparent">
                  <DatesTab project={project} />
                </TabsContent>

                <TabsContent value="documents" className="m-0 bg-transparent">
                  <DocumentsTab projectId={projectId} media={project.media || []} />
                </TabsContent>

                <TabsContent value="tasks" className="m-0 bg-transparent">
                  <TasksTab projectId={projectId} />
                </TabsContent>

                <TabsContent value="notes" className="m-0 bg-transparent">
                  <NotesTab
                    notes={project.notes || []}
                    onAddNote={handleAddNote}
                    isAddingNote={createNote.isPending}
                  />
                </TabsContent>

                <TabsContent value="expenses" className="m-0 bg-transparent">
                  <ExpensesTab
                    laborEntries={project.labor_entries || []}
                    receipts={project.receipts || []}
                    workOrders={project.work_orders || []}
                    onAddLabor={() => {
                      setEditingLabor(null);
                      setShowLaborModal(true);
                    }}
                    onEditLabor={(entry) => {
                      setEditingLabor(entry);
                      setShowLaborModal(true);
                    }}
                    onAddReceipt={() => {
                      setEditingReceipt(null);
                      setShowReceiptModal(true);
                    }}
                    onEditReceipt={(receipt) => {
                      setEditingReceipt(receipt);
                      setShowReceiptModal(true);
                    }}
                    onAddWorkOrder={() => {
                      setEditingWorkOrder(null);
                      setShowWorkOrderModal(true);
                    }}
                    onEditWorkOrder={(workOrder) => {
                      setEditingWorkOrder(workOrder);
                      setShowWorkOrderModal(true);
                    }}
                  />
                </TabsContent>

                <TabsContent value="drying" className="m-0 bg-transparent p-4">
                  <DryingTab projectId={projectId} jobNumber={project.job_number} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Contacts Card */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Assigned Contacts</h3>
                  <span className="text-sm text-muted-foreground">
                    ({project.contacts?.length || 0})
                  </span>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAddContactModal(true)}
                    className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>
              {project.contacts?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {project.contacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/60 italic">No contacts assigned to this project</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Accounting Module */}
            <AccountingModule
              summary={project.accounting_summary}
              estimates={project.estimates || []}
              payments={project.payments || []}
              laborEntries={project.labor_entries || []}
              receipts={project.receipts || []}
              readyToInvoice={project.ready_to_invoice}
              onAddEstimate={() => setShowAddEstimateModal(true)}
              onAddReceipt={() => setShowReceiptModal(true)}
              onAddLabor={() => setShowLaborModal(true)}
              onAddWorkOrder={() => setShowWorkOrderModal(true)}
              onToggleReadyToInvoice={handleToggleReadyToInvoice}
              isToggling={toggleReadyToInvoice.isPending}
              isLoading={isLoading}
            />

            {/* Event Viewer */}
            <EventViewer
              events={activityData?.activities || []}
              isLoading={activityLoading}
            />
          </div>
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

      {showLaborModal && (
        <LaborEntryModal
          projectId={projectId}
          entry={editingLabor || undefined}
          onClose={() => {
            setShowLaborModal(false);
            setEditingLabor(null);
          }}
        />
      )}

      {showReceiptModal && (
        <ReceiptModal
          projectId={projectId}
          receipt={editingReceipt || undefined}
          onClose={() => {
            setShowReceiptModal(false);
            setEditingReceipt(null);
          }}
        />
      )}

      {showWorkOrderModal && (
        <WorkOrderModal
          projectId={projectId}
          workOrder={editingWorkOrder || undefined}
          onClose={() => {
            setShowWorkOrderModal(false);
            setEditingWorkOrder(null);
          }}
        />
      )}
    </div>
  );
}
