import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building,
  User,
  FileText,
  DollarSign,
  Calendar,
  Edit,
  Plus,
  ChevronDown,
  Droplets,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import {
  useProject,
  useUpdateProjectStatus,
  useCreateNote,
  type ProjectFull,
  type Note,
  type Estimate,
  type Payment,
  type ProjectContact,
} from '@/hooks/useProjects';

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

// Format date for display
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format currency
function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Damage source icon
function getDamageIcon(source?: string) {
  const s = source?.toLowerCase() || '';
  if (s.includes('water') || s.includes('sewage') || s.includes('flood')) {
    return <Droplets className="h-5 w-5 text-blue-500" />;
  }
  if (s.includes('fire') || s.includes('smoke')) {
    return <Flame className="h-5 w-5 text-orange-500" />;
  }
  if (s.includes('mold')) {
    return <AlertTriangle className="h-5 w-5 text-green-600" />;
  }
  return <Building className="h-5 w-5 text-gray-500" />;
}

// Contact card component
function ContactCard({ contact }: { contact: ProjectContact }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between">
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
      </div>
      <div className="flex gap-4 mt-2 text-sm">
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
            <Phone className="h-3 w-3" />
            {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
            <Mail className="h-3 w-3" />
            {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}

// Note card component
function NoteCard({ note }: { note: Note }) {
  return (
    <div className="border-l-2 border-primary/30 pl-3 py-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <span>{formatDate(note.created_at)}</span>
        {note.author_name && <span>- {note.author_name}</span>}
        {note.note_type && (
          <span className="px-1.5 py-0.5 bg-muted rounded text-xs">{note.note_type}</span>
        )}
      </div>
      {note.subject && <p className="font-medium text-sm">{note.subject}</p>}
      <p className="text-sm">{note.content}</p>
    </div>
  );
}

// Estimate card component
function EstimateCard({ estimate }: { estimate: Estimate }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    revision_requested: 'bg-yellow-100 text-yellow-700',
    denied: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div className="flex items-center gap-4">
        <span className="font-medium">v{estimate.version}</span>
        <span className="text-lg font-semibold">{formatCurrency(estimate.amount)}</span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[estimate.status] || 'bg-gray-100'}`}>
          {estimate.status.replace('_', ' ').charAt(0).toUpperCase() + estimate.status.slice(1).replace('_', ' ')}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        {estimate.submitted_date && <span>Submitted: {formatDate(estimate.submitted_date)}</span>}
      </div>
    </div>
  );
}

// Payment card component
function PaymentCard({ payment }: { payment: Payment }) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div className="flex items-center gap-4">
        <span className="text-lg font-semibold">{formatCurrency(payment.amount)}</span>
        {payment.check_number && (
          <span className="text-sm text-muted-foreground">Check #{payment.check_number}</span>
        )}
        {payment.payment_method && (
          <span className="px-2 py-0.5 bg-muted rounded text-xs">{payment.payment_method}</span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {payment.received_date && <span>Received: {formatDate(payment.received_date)}</span>}
      </div>
    </div>
  );
}

// Section header component
function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      {action}
    </div>
  );
}

// Add Note Modal
function AddNoteModal({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (content: string, noteType?: string, subject?: string) => void;
  isSubmitting: boolean;
}) {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [noteType, setNoteType] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add Note</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject (optional)</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Brief subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type (optional)</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
            >
              <option value="">Select type...</option>
              <option value="general">General</option>
              <option value="call">Phone Call</option>
              <option value="email">Email</option>
              <option value="site_visit">Site Visit</option>
              <option value="documentation">Documentation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]"
              placeholder="Enter note content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(content, noteType || undefined, subject || undefined)}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
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

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: projectId, status: newStatus });
    setShowStatusMenu(false);
  };

  const handleAddNote = (content: string, noteType?: string, subject?: string) => {
    createNote.mutate(
      { projectId, content, noteType, subject },
      { onSuccess: () => setShowAddNote(false) }
    );
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

  // Calculate totals
  const totalEstimated = project.estimates?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  const totalReceived = project.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Back link */}
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {getDamageIcon(project.damage_source)}
              <h1 className="text-2xl font-bold">{project.job_number}</h1>
              <span className="text-muted-foreground">-</span>
              <span className="text-xl">{project.client_name || 'No client'}</span>
            </div>
            <p className="text-muted-foreground">
              {project.address}, {project.city}, {project.state} {project.zip}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{project.damage_source || 'Unknown damage'}</span>
              {project.date_of_loss && <span>DOL: {formatDate(project.date_of_loss)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
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
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Project info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Dates */}
            <div className="border rounded-lg p-4">
              <SectionHeader title="Key Dates" icon={<Calendar className="h-4 w-4" />} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date of Loss</p>
                  <p className="font-medium">{formatDate(project.date_of_loss)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contacted</p>
                  <p className="font-medium">{formatDate(project.date_contacted)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inspection</p>
                  <p className="font-medium">{formatDate(project.inspection_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Work Auth Signed</p>
                  <p className="font-medium">{formatDate(project.work_auth_signed_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Start</p>
                  <p className="font-medium">{formatDate(project.start_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">COS Signed</p>
                  <p className="font-medium">{formatDate(project.cos_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completion</p>
                  <p className="font-medium">{formatDate(project.completion_date)}</p>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="border rounded-lg p-4">
              <SectionHeader
                title="Assigned Contacts"
                icon={<User className="h-4 w-4" />}
                action={
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                }
              />
              {project.contacts?.length > 0 ? (
                <div className="space-y-2">
                  {project.contacts.map((contact) => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contacts assigned</p>
              )}
            </div>

            {/* Estimates */}
            <div className="border rounded-lg p-4">
              <SectionHeader
                title="Estimates"
                icon={<FileText className="h-4 w-4" />}
                action={
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                }
              />
              {project.estimates?.length > 0 ? (
                <div className="space-y-2">
                  {project.estimates.map((estimate) => (
                    <EstimateCard key={estimate.id} estimate={estimate} />
                  ))}
                  <div className="text-right text-sm text-muted-foreground mt-2">
                    Total Estimated: <span className="font-semibold">{formatCurrency(totalEstimated)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No estimates yet</p>
              )}
            </div>

            {/* Payments */}
            <div className="border rounded-lg p-4">
              <SectionHeader
                title="Payments"
                icon={<DollarSign className="h-4 w-4" />}
                action={
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                }
              />
              {project.payments?.length > 0 ? (
                <div className="space-y-2">
                  {project.payments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))}
                  <div className="text-right text-sm text-muted-foreground mt-2">
                    Total Received: <span className="font-semibold">{formatCurrency(totalReceived)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payments recorded</p>
              )}
            </div>

            {/* Notes */}
            <div className="border rounded-lg p-4">
              <SectionHeader
                title="Notes"
                icon={<FileText className="h-4 w-4" />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => setShowAddNote(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                }
              />
              {project.notes?.length > 0 ? (
                <div className="space-y-3">
                  {project.notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet</p>
              )}
            </div>
          </div>

          {/* Right column - Client & Insurance */}
          <div className="space-y-6">
            {/* Client Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Client</h3>
              {project.client ? (
                <div className="space-y-2">
                  <p className="font-medium">{project.client.name}</p>
                  {project.client.phone && (
                    <a
                      href={`tel:${project.client.phone}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                      {project.client.phone}
                    </a>
                  )}
                  {project.client.email && (
                    <a
                      href={`mailto:${project.client.email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-4 w-4" />
                      {project.client.email}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No client assigned</p>
              )}
            </div>

            {/* Insurance Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Insurance</h3>
              {project.carrier ? (
                <div className="space-y-2">
                  <p className="font-medium">{project.carrier.name}</p>
                  {project.claim_number && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Claim: </span>
                      <span>{project.claim_number}</span>
                    </div>
                  )}
                  {project.policy_number && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Policy: </span>
                      <span>{project.policy_number}</span>
                    </div>
                  )}
                  {project.deductible && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Deductible: </span>
                      <span>{formatCurrency(project.deductible)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No insurance carrier</p>
              )}
            </div>

            {/* Property Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Property Details</h3>
              <div className="space-y-2 text-sm">
                {project.structure_type && (
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span>{project.structure_type}</span>
                  </div>
                )}
                {project.year_built && (
                  <div>
                    <span className="text-muted-foreground">Year Built: </span>
                    <span>{project.year_built}</span>
                  </div>
                )}
                {project.square_footage && (
                  <div>
                    <span className="text-muted-foreground">Sq Footage: </span>
                    <span>{project.square_footage.toLocaleString()} sq ft</span>
                  </div>
                )}
                {project.damage_category && (
                  <div>
                    <span className="text-muted-foreground">Category: </span>
                    <span>{project.damage_category}</span>
                  </div>
                )}
                {project.damage_class && (
                  <div>
                    <span className="text-muted-foreground">Class: </span>
                    <span>{project.damage_class}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <AddNoteModal
          onClose={() => setShowAddNote(false)}
          onSubmit={handleAddNote}
          isSubmitting={createNote.isPending}
        />
      )}
    </div>
  );
}
