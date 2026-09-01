import { makeId, nowIso } from "./ids";
import type { Project } from "@/lib/schemas/project";
import type { Campaign } from "@/lib/schemas/campaign";
import type { Sponsorship } from "@/lib/schemas/sponsorship";
import type { Donation } from "@/lib/schemas/donation";
import type { ImpactUpdate } from "@/lib/schemas/impact-update";
import type { Certificate } from "@/lib/schemas/certificate";
import type { NotificationItem } from "@/lib/api/notifications";

export type Db = {
  users: Array<{
    _id: string;
    id: string;
    firebaseUid: string;
    email: string;
    name: string;
    phoneNumber?: string;
    roles: string[];
    entityType?: string | null;
    isVerified: boolean;
    isActive: boolean;
    isDeleted?: boolean;
    profile?: {
      avatarUrl?: string;
      bio?: string;
      location?: string;
      organizationName?: string;
      socialLinks?: Array<{ platform: string; profileUrl: string; isPrimary: boolean }>;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  projects: Project[];
  campaigns: Campaign[];
  sponsorships: Sponsorship[];
  donations: Donation[];
  impactUpdates: ImpactUpdate[];
  certificates: Certificate[];
  notifications: NotificationItem[];
  deviceTokens: Array<{ token: string; userId: string; createdAt: string }>;
};

function buildDb(): Db {
  const t0 = nowIso();
  const project1Id = makeId();
  const project2Id = makeId();
  const project3Id = makeId();

  const milestones1 = [
    {
      _id: makeId(),
      title: "Site survey and hydro-geological assessment",
      description: "Local team verifies water table depth and soil composition.",
      status: "done",
      completedAt: t0,
      verifiedBy: "delivery-lead",
    },
    {
      _id: makeId(),
      title: "Drilling contractor mobilization",
      description: "Truck, rig, casing materials delivered to site.",
      status: "in_progress",
      completedAt: null,
      verifiedBy: null,
    },
    {
      _id: makeId(),
      title: "Drilling to 80m + casing installation",
      description: "Borehole drilled, steel casing installed, screen set.",
      status: "pending",
      completedAt: null,
      verifiedBy: null,
    },
    {
      _id: makeId(),
      title: "Hand-pump installation and yield test",
      description: "Afridev pump installed, 24-hour yield test passed.",
      status: "pending",
      completedAt: null,
      verifiedBy: null,
    },
    {
      _id: makeId(),
      title: "Handover + community training",
      description: "Water committee trained on maintenance, spare parts kit delivered.",
      status: "pending",
      completedAt: null,
      verifiedBy: null,
    },
  ];

  const projects: Project[] = [
    {
      _id: project1Id,
      title: "Borehole at Adama Primary School",
      shortDescription: "A clean-water borehole serving 1,200 students and the surrounding community.",
      fullDescription:
        "Adama Primary sits on a dry plot two kilometers from the nearest functional well. Students lose class time walking for water; younger children miss school entirely. A new borehole with an Afridev hand-pump will serve the school during the day and the community in the evenings.",
      location: { lat: 8.54, lng: 39.27 },
      gpsCoordinates: "8.54° N, 39.27° E",
      budget: 1_800_000_00,
      currency: "ETB",
      currentFunding: 620_000_00,
      costBreakdown: [
        { _id: makeId(), item: "Drilling & casing (80m)", amount: 950_000_00 },
        { _id: makeId(), item: "Hand-pump + apron", amount: 280_000_00 },
        { _id: makeId(), item: "Site preparation", amount: 120_000_00 },
        { _id: makeId(), item: "Training + spare parts", amount: 150_000_00 },
        { _id: makeId(), item: "Project management & contingency", amount: 300_000_00 },
      ],
      beneficiaryCount: 1200,
      estimatedPeopleServed: 5000,
      status: "fundable",
      milestones: milestones1,
      photos: [
        "https://images.unsplash.com/photo-1541544537156-7627a7a4aa1c?w=1200",
        "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200",
      ],
      proofOfImpact: [
        {
          _id: makeId(),
          type: "photo",
          url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1200",
          uploadedBy: "delivery-team",
          date: t0,
        },
      ],
      createdBy: "program-director",
      updatedBy: "program-director",
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: project2Id,
      title: "Spring protection — Wenchi Crater Lake watershed",
      shortDescription: "Protect three natural springs feeding the Wenchi watershed with capped masonry tanks.",
      fullDescription:
        "Three unprotected springs in the Wenchi watershed currently serve ~3,000 people but are contaminated by surface runoff during rainy season. Capping, fencing, and a tap-stand network will yield clean water year-round.",
      location: { lat: 9.03, lng: 38.13 },
      gpsCoordinates: "9.03° N, 38.13° E",
      budget: 950_000_00,
      currency: "ETB",
      currentFunding: 950_000_00,
      costBreakdown: [
        { _id: makeId(), item: "Masonry works (3 spring boxes)", amount: 420_000_00 },
        { _id: makeId(), item: "Tap-stands & piping", amount: 230_000_00 },
        { _id: makeId(), item: "Fencing & access", amount: 110_000_00 },
        { _id: makeId(), item: "Training & oversight", amount: 90_000_00 },
        { _id: makeId(), item: "Contingency", amount: 100_000_00 },
      ],
      beneficiaryCount: 800,
      estimatedPeopleServed: 3000,
      status: "in_progress",
      milestones: [
        {
          _id: makeId(),
          title: "Community consultations",
          description: "Three village meetings; water committee elected.",
          status: "done",
          completedAt: t0,
          verifiedBy: "site-engineer",
        },
        {
          _id: makeId(),
          title: "Spring box construction",
          description: "All three spring boxes poured and cured.",
          status: "in_progress",
          completedAt: null,
          verifiedBy: null,
        },
        {
          _id: makeId(),
          title: "Tap-stand network",
          description: "Five tap-stands installed and connected.",
          status: "pending",
          completedAt: null,
          verifiedBy: null,
        },
      ],
      photos: [
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200",
      ],
      proofOfImpact: [],
      createdBy: "program-director",
      updatedBy: "delivery-team",
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: project3Id,
      title: "Shallow well — Debre Berhan community",
      shortDescription: "Hand-dug well with concrete lining and pulley for a community of 2,000.",
      fullDescription:
        "A new 12-meter hand-dug well with a concrete liner, pulley, and drainage apron. Replaces an open pond used for washing and livestock.",
      location: { lat: 9.68, lng: 39.53 },
      gpsCoordinates: "9.68° N, 39.53° E",
      budget: 420_000_00,
      currency: "ETB",
      currentFunding: 0,
      costBreakdown: [
        { _id: makeId(), item: "Hand-digging & lining", amount: 220_000_00 },
        { _id: makeId(), item: "Pulley, rope, headwall", amount: 90_000_00 },
        { _id: makeId(), item: "Apron & drainage", amount: 60_000_00 },
        { _id: makeId(), item: "Training & spare parts", amount: 50_000_00 },
      ],
      beneficiaryCount: 600,
      estimatedPeopleServed: 2000,
      status: "assessment",
      milestones: [],
      photos: [],
      proofOfImpact: [],
      createdBy: "program-director",
      updatedBy: "program-director",
      createdAt: t0,
      updatedAt: t0,
    },
  ];

  const campaigns: Campaign[] = [
    {
      _id: makeId(),
      projectId: project1Id,
      title: "Bring clean water to Adama Primary",
      summary: "Help fund a borehole that will serve 1,200 students and 5,000 neighbors.",
      story:
        "I'm a teacher at Adama Primary. Our students walk 2 km each way to fetch water, often missing class. A borehole on our school grounds would change everything. Every birr counts.",
      goalAmount: 500_000_00,
      currentAmount: 215_000_00,
      currency: "ETB",
      dropsGoal: 1000,
      startDate: t0,
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
      joinable: true,
      participants: [
        { _id: makeId(), userId: "u-teacher", role: "creator", joinedAt: t0 },
        { _id: makeId(), userId: "u-volunteer", role: "co_fundraiser", joinedAt: t0 },
      ],
      photos: projects[0].photos,
      createdBy: "u-teacher",
      approvedBy: "u-manager",
      updatedBy: "u-teacher",
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      projectId: project1Id,
      title: "Class 8B for the borehole",
      summary: "Class 8B's student-led campaign to put their school on the map.",
      goalAmount: 80_000_00,
      currentAmount: 12_500_00,
      currency: "ETB",
      dropsGoal: 200,
      status: "active",
      joinable: true,
      participants: [{ _id: makeId(), userId: "u-class8b", role: "creator", joinedAt: t0 }],
      photos: [],
      createdBy: "u-class8b",
      approvedBy: "u-manager",
      updatedBy: "u-class8b",
      createdAt: t0,
      updatedAt: t0,
    },
  ];

  const sponsorships: Sponsorship[] = [
    {
      _id: makeId(),
      campaignId: campaigns[0]._id,
      corporateName: "Acme Ethiopia",
      logoUrl: "https://placehold.co/200x80/0ea5e9/ffffff?text=ACME",
      amount: 100_000_00,
      currency: "ETB",
      message: "Matching the first 100,000 ETB raised by the community.",
      type: "matching",
      isActive: true,
      createdBy: "u-manager",
      updatedBy: "u-manager",
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      campaignId: campaigns[0]._id,
      corporateName: "Greenfield University",
      logoUrl: "https://placehold.co/200x80/16a34a/ffffff?text=GFU",
      amount: 25_000_00,
      currency: "ETB",
      message: "Proud to support clean water for Adama Primary.",
      type: "campus_sponsor",
      isActive: true,
      createdBy: "u-manager",
      updatedBy: "u-manager",
      createdAt: t0,
      updatedAt: t0,
    },
  ];

  campaigns[0].sponsorships = sponsorships.filter((s) => s.campaignId === campaigns[0]._id);

  const donations: Donation[] = [
    {
      _id: makeId(),
      campaignId: campaigns[0]._id,
      projectId: project1Id,
      donorId: "u-anon1",
      donorSnapshot: { name: "Anonymous" },
      amount: 5_000_00,
      currency: "ETB",
      paymentMethod: "chapa",
      transactionId: "dow-mock-1",
      paidAt: t0,
      status: "completed",
      requiresManualReview: false,
      isAnonymous: true,
      createdBy: "u-anon1",
      updatedBy: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      campaignId: campaigns[0]._id,
      projectId: project1Id,
      donorId: "u-donor2",
      donorSnapshot: { name: "Meron Tadesse" },
      amount: 10_000_00,
      currency: "ETB",
      paymentMethod: "chapa",
      transactionId: "dow-mock-2",
      paidAt: t0,
      status: "completed",
      requiresManualReview: false,
      isAnonymous: false,
      createdBy: "u-donor2",
      updatedBy: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      campaignId: campaigns[0]._id,
      projectId: project1Id,
      donorId: "u-donor3",
      donorSnapshot: { name: "Yonas Bekele" },
      amount: 50_000_00,
      currency: "ETB",
      paymentMethod: "chapa",
      transactionId: "dow-mock-3",
      paidAt: t0,
      status: "manual_review",
      requiresManualReview: true,
      isAnonymous: false,
      createdBy: "u-donor3",
      updatedBy: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      campaignId: campaigns[1]._id,
      projectId: project1Id,
      donorId: "u-donor2",
      donorSnapshot: { name: "Meron Tadesse" },
      amount: 2_500_00,
      currency: "ETB",
      paymentMethod: "chapa",
      transactionId: "dow-mock-meron-2",
      paidAt: t0,
      status: "completed",
      requiresManualReview: false,
      message: "For the kids!",
      isAnonymous: false,
      createdBy: "u-donor2",
      updatedBy: null,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      campaignId: null,
      projectId: undefined,
      donorId: "u-donor2",
      donorSnapshot: { name: "Meron Tadesse" },
      amount: 5_000_00,
      currency: "ETB",
      paymentMethod: "zeffy",
      transactionId: "dow-mock-meron-3",
      paidAt: t0,
      status: "pending",
      requiresManualReview: false,
      isAnonymous: false,
      createdBy: "u-donor2",
      updatedBy: null,
      createdAt: t0,
      updatedAt: t0,
    },
  ];

  const impactUpdates: ImpactUpdate[] = [
    {
      _id: makeId(),
      projectId: project1Id,
      campaignId: campaigns[0]._id,
      authorId: "u-delivery",
      title: "Drilling begins on the Adama Primary borehole",
      content:
        "After a successful hydro-geological survey and community consultations, the drilling contractor has mobilized to site. The first 20 meters were drilled this week without major issues; the team expects to reach the water table at ~60m next week.",
      attachments: [
        { type: "image", url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1200" },
      ],
      status: "published",
      publishedAt: t0,
      rejectionReason: null,
      approvedBy: "u-content-manager",
      updatedBy: "u-delivery",
      createdAt: t0,
      updatedAt: t0,
    },
    {
      _id: makeId(),
      projectId: project2Id,
      campaignId: null,
      authorId: "u-site-engineer",
      title: "Wenchi spring boxes — work in progress",
      content:
        "Two of three spring boxes are poured. Curing for 14 days, then we'll start on the tap-stand network.",
      attachments: [],
      status: "published",
      publishedAt: t0,
      rejectionReason: null,
      approvedBy: "u-content-manager",
      updatedBy: "u-site-engineer",
      createdAt: t0,
      updatedAt: t0,
    },
  ];

  const certificates: Certificate[] = [
    {
      id: makeId(),
      type: "fundraising",
      title: "Silver Fundraising Certificate",
      description:
        "Awarded to Meron Tadesse for raising 12,500.00 ETB across 1 campaign on Drop of Water — Silver tier.",
      badgeLevel: "silver",
      recipient: { id: "u-donor2", name: "Meron Tadesse" },
      totalAmount: 12_500_00,
      totalHours: 0,
      currency: "ETB",
      relatedCampaignIds: [campaigns[1]._id],
      certificateCode: "DOW-FR-DEMO00001",
      isPublic: true,
      issuedAt: t0,
      version: 1,
      supersededAt: null,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: makeId(),
      title: "New impact update",
      body: "Drilling begins on the Adama Primary borehole",
      data: { projectId: project1Id },
      read: false,
      createdAt: t0,
    },
    {
      id: makeId(),
      title: "Your donation has settled",
      body: "Thank you for supporting Bring clean water to Adama Primary",
      data: { campaignId: campaigns[0]._id, donationId: "dow-mock-2" },
      read: true,
      createdAt: t0,
    },
  ];

  // A draft campaign owned by Meron (so /me/campaigns has something to show).
  campaigns.push({
    _id: makeId(),
    projectId: project3Id,
    title: "Help us dig a well in Debre Berhan",
    summary: "Student-led campaign to fund a hand-dug well for a community of 2,000.",
    story:
      "We're a group of high-school seniors in Debre Berhan. Our school sits on a hill overlooking a community that still gets its water from an open pond. With your help, we can fund a proper hand-dug well with a concrete liner and pulley.",
    goalAmount: 150_000_00,
    currentAmount: 0,
    currency: "ETB",
    dropsGoal: 300,
    startDate: t0,
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: "draft",
    joinable: true,
    participants: [
      { _id: makeId(), userId: "u-donor2", role: "creator", joinedAt: t0 },
    ],
    photos: [],
    createdBy: "u-donor2",
    updatedBy: "u-donor2",
    createdAt: t0,
    updatedAt: t0,
  } as never);

  // A pending-approval campaign for Meron.
  campaigns.push({
    _id: makeId(),
    projectId: project2Id,
    title: "Class of 2025 for Wenchi springs",
    summary: "Final-year students sponsoring the spring protection project.",
    goalAmount: 80_000_00,
    currentAmount: 0,
    currency: "ETB",
    status: "pending_approval",
    joinable: false,
    participants: [
      { _id: makeId(), userId: "u-donor2", role: "creator", joinedAt: t0 },
    ],
    photos: [],
    createdBy: "u-donor2",
    updatedBy: "u-donor2",
    createdAt: t0,
    updatedAt: t0,
  } as never);

  return {
    users: [
      {
        _id: makeId(),
        id: "u-donor2",
        firebaseUid: "mock-meron",
        email: "meron@example.com",
        name: "Meron Tadesse",
        roles: ["donor", "campaign_creator"],
        entityType: "individual",
        isVerified: true,
        isActive: true,
        profile: { location: "Addis Ababa" },
        createdAt: t0,
        updatedAt: t0,
      },
    ],
    projects,
    campaigns,
    sponsorships,
    donations,
    impactUpdates,
    certificates,
    notifications,
    deviceTokens: [],
  };
}

let dbInstance: Db | null = null;
export function getDb(): Db {
  if (!dbInstance) dbInstance = buildDb();
  return dbInstance;
}

export function resetDb(): void {
  dbInstance = buildDb();
}
