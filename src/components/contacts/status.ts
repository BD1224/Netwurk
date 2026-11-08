// Display labels for a contact's status, in pipeline order.
import type { ContactStatus } from "@/types";

export const STATUS_LABELS: Record<ContactStatus, string> = {
  to_contact: "To reach out",
  reached_out: "Reached out",
  replied: "Replied",
  met: "Met",
};

export const STATUSES = Object.keys(STATUS_LABELS) as ContactStatus[];
