"""Domain enums shared across the application."""

from enum import Enum


class Role(str, Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    ADMIN = "admin"


class Category(str, Enum):
    POTHOLE = "Pothole"
    STREETLIGHT = "Street Light"
    GARBAGE = "Garbage / Sanitation"
    WATER = "Water / Drainage"
    NOISE = "Noise"
    GRAFFITI = "Graffiti"
    TRAFFIC = "Traffic Signal"
    PARKS = "Parks / Trees"
    OTHER = "Other"


class Status(str, Enum):
    NEW = "New"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REOPENED = "Reopened"


class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


CATEGORY_DEPARTMENT = {
    Category.POTHOLE.value: "Public Works",
    Category.STREETLIGHT.value: "Utilities",
    Category.GARBAGE.value: "Sanitation",
    Category.WATER.value: "Water & Drainage",
    Category.NOISE.value: "Code Enforcement",
    Category.GRAFFITI.value: "Parks & Recreation",
    Category.TRAFFIC.value: "Transportation",
    Category.PARKS.value: "Parks & Recreation",
    Category.OTHER.value: "General Services",
}

STATUS_TRANSITIONS = {
    Status.NEW.value: {Status.ASSIGNED.value},
    Status.ASSIGNED.value: {Status.IN_PROGRESS.value, Status.NEW.value},
    Status.IN_PROGRESS.value: {Status.RESOLVED.value, Status.ASSIGNED.value},
    Status.RESOLVED.value: {Status.REOPENED.value},
    Status.REOPENED.value: {Status.ASSIGNED.value, Status.IN_PROGRESS.value},
}