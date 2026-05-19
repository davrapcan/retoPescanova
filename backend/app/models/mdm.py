"""Internal data models for MDM (not response schemas)."""
from enum import Enum


class DeploymentStatus(str, Enum):
    installed = "Installed"
    delay = "Delay in Deployment"
    reboot_pending = "Reboot Pending"
    failed = "Failed"


class PatchingStatus(str, Enum):
    completed = "Patching Completed"
    missing = "Patches Missing"
    in_progress = "Patching Inprogress"
    failed = "Patching Failed"
