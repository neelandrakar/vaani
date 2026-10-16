import { PrismaClient, Role, LeadStatus, TransactionType, ConversationChannel, ConversationStatus, ConversationOutcome, MessageRole, CallbackStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with demo data for Vaani Calling ERP...');

  // 1. Create or update Business Configuration
  let business = await prisma.businessConfig.findFirst({
    where: { name: 'Vaani Skyline Realty' },
  });

  if (!business) {
    business = await prisma.businessConfig.create({
      data: {
        name: 'Vaani Skyline Realty',
        legalName: 'Vaani Skyline Real Estate Private Limited',
        industry: 'Residential Real Estate',
        timezone: 'Asia/Kolkata',
        phone: '+91 80 4000 8899',
        email: 'hello@vaaniskyline.com',
        address: '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038, India',
      },
    });
  }

  // 2. Create Users (Admin & Operator)
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const operatorPassword = await bcrypt.hash('Operator@12345', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@vaani.ai' },
    update: {},
    create: {
      email: 'admin@vaani.ai',
      passwordHash: adminPassword,
      name: 'Aditi Deshmukh (Admin)',
      role: Role.ADMIN,
      businessId: business.id,
    },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@vaani.ai' },
    update: {},
    create: {
      email: 'operator@vaani.ai',
      passwordHash: operatorPassword,
      name: 'Karan Mehra (Property Specialist)',
      role: Role.OPERATOR,
      businessId: business.id,
    },
  });

  console.log('👤 Users seeded: admin@vaani.ai and operator@vaani.ai');

  // 3. Create Agent Configuration
  await prisma.agentConfig.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      name: 'Aura',
      introduction: 'Namaste! I am Vaani, your AI property assistant from Vaani Skyline Realty. Are you looking to buy or rent a property today?',
      fallbackMessage: 'I apologize, but I do not have verified information on that. Let me connect you with our senior property consultant for complete details.',
      supportedLanguages: ['en', 'hi', 'bn'],
      voiceGender: 'female',
      activeProvider: 'mock',
      asrModel: 'ai4bharat/indic-conformer-600m-multilingual',
      llmModel: 'Qwen/Qwen3-8B',
      ttsModel: 'ai4bharat/indic-parler-tts',
      qualificationPrompt: `You are Vaani, an AI property qualification assistant for Vaani Skyline Realty.
Qualify the prospect by naturally asking:
1. Transaction type (Buy or Rent)
2. Preferred location in Bangalore (Whitefield, Indiranagar, HSR Layout, etc.)
3. Property type (Apartment, Villa, Penthouse)
4. Bedrooms (2 BHK, 3 BHK, 4 BHK)
5. Budget range
6. Timeline to move/purchase

Only ask one question at a time. Be polite, concise, and helpful. Always offer a callback appointment when requirements are identified.`,
      escalationRules: 'Escalate to human operator if customer is upset, asks for legal disputes, insists on talking to a person, or has complex mortgage queries.',
      isRecordingEnabled: false,
      retentionDays: 30,
    },
  });

  // 4. Approved Property Catalogue
  const propertiesData = [
    {
      title: 'Sobha Dream Acres - Luxury 3 BHK',
      propertyType: 'Apartment',
      transactionType: TransactionType.BUY,
      location: 'Whitefield',
      address: 'Panathur Main Rd, Balagere, Bengaluru, Karnataka 560087',
      price: 14500000, // 1.45 Cr
      bedrooms: 3,
      bathrooms: 3,
      areaSqFt: 1560,
      status: 'AVAILABLE',
      features: ['Clubhouse', 'Swimming Pool', 'RERA Approved', 'Covered Parking', 'Gymnasium'],
      approvedDescription: 'Premium ready-to-move 3 BHK apartment in Whitefield with panoramic view, double balcony, and 80% open landscaped green space.',
    },
    {
      title: 'Prestige Silver Oak - 4 BHK Executive Villa',
      propertyType: 'Villa',
      transactionType: TransactionType.BUY,
      location: 'Whitefield',
      address: 'ECC Road, Pattandur Agrahara, Whitefield, Bengaluru 560066',
      price: 32000000, // 3.20 Cr
      bedrooms: 4,
      bathrooms: 5,
      areaSqFt: 3400,
      status: 'AVAILABLE',
      features: ['Private Garden', 'Gated Community', 'Italian Marble', 'Home Theatre Room', '2 Car Parking'],
      approvedDescription: 'Ultra-luxury 4 BHK independent duplex villa situated in the quietest enclave of Whitefield with private terrace garden.',
    },
    {
      title: 'Godrej Splendour - Modern 2 BHK',
      propertyType: 'Apartment',
      transactionType: TransactionType.RENT,
      location: 'Whitefield',
      address: 'Belathur, Whitefield, Bengaluru 560067',
      price: 42000, // 42,000 / mo
      bedrooms: 2,
      bathrooms: 2,
      areaSqFt: 980,
      status: 'AVAILABLE',
      features: ['Semi-furnished', 'Modular Kitchen', 'Power Backup', 'Near Metro Station'],
      approvedDescription: 'Brand new semi-furnished 2 BHK apartment with modular kitchen, piped gas connection, and 5 minutes walk to Hopefarm Metro.',
    },
    {
      title: 'Brigade Cornerstone Utopia - High-Rise 2 BHK',
      propertyType: 'Apartment',
      transactionType: TransactionType.BUY,
      location: 'Whitefield',
      address: 'Varthur Rd, Gunjur, Bengaluru 560087',
      price: 9800000, // 98 Lakh
      bedrooms: 2,
      bathrooms: 2,
      areaSqFt: 1120,
      status: 'AVAILABLE',
      features: ['Integrated Township', 'Multiplex inside campus', 'EV Charging', 'Smart Home Tech'],
      approvedDescription: 'Integrated smart community 2 BHK apartment on the 14th floor with futuristic amenities and tech-enabled home automation.',
    },
    {
      title: 'Indiranagar Prime - 3 BHK Designer Penthouse',
      propertyType: 'Penthouse',
      transactionType: TransactionType.RENT,
      location: 'Indiranagar',
      address: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru 560038',
      price: 85000, // 85,000 / mo
      bedrooms: 3,
      bathrooms: 3,
      areaSqFt: 2150,
      status: 'AVAILABLE',
      features: ['Fully Furnished', 'Private Terrace', 'Jacuzzi', 'Wood Flooring', 'Close to Metro'],
      approvedDescription: 'Exclusive fully furnished penthouse in heart of Indiranagar with expansive private open terrace, jacuzzi, and dedicated elevator access.',
    },
  ];

  for (const prop of propertiesData) {
    const existing = await prisma.property.findFirst({
      where: { businessId: business.id, title: prop.title },
    });
    if (!existing) {
      await prisma.property.create({
        data: {
          ...prop,
          businessId: business.id,
        },
      });
    }
  }
  console.log('🏢 Properties catalogue seeded.');

  // 5. Approved Knowledge Base (FAQs)
  const faqs = [
    {
      category: 'Pricing',
      question: 'What is the price range of 3 BHK apartments in Whitefield?',
      answer: 'Our verified 3 BHK apartments in Whitefield range from ₹1.25 Crore to ₹1.85 Crore depending on square footage, amenities, and floor selection.',
      keywords: ['price', 'pricing', 'cost', 'budget', '3 bhk', 'whitefield', 'rate'],
    },
    {
      category: 'RERA',
      question: 'Are all listed properties RERA registered?',
      answer: 'Yes, 100% of properties listed with Vaani Skyline Realty are RERA registered with clear marketable titles, occupancy certificates, and full legal clearance.',
      keywords: ['rera', 'legal', 'approval', 'registration', 'title', 'clearance'],
    },
    {
      category: 'Site Visit',
      question: 'How do I arrange a site visit?',
      answer: 'We provide complimentary chauffeured site visits 7 days a week between 10:00 AM and 6:00 PM IST. Our assistant can schedule one for you right now.',
      keywords: ['site visit', 'inspection', 'tour', 'visit', 'timing', 'schedule'],
    },
    {
      category: 'Amenities',
      question: 'What amenities are standard across your gated projects?',
      answer: 'Standard amenities include 24/7 security with CCTV, 100% power backup, grand clubhouse, swimming pool, indoor badminton court, gym, and landscaped jogging tracks.',
      keywords: ['amenities', 'facility', 'clubhouse', 'pool', 'gym', 'security'],
    },
    {
      category: 'Maintenance',
      question: 'What are the expected monthly maintenance charges?',
      answer: 'Monthly maintenance charges typically range between ₹3.50 and ₹4.50 per square foot, covering common area electricity, 24/7 security, gardening, and elevator upkeep.',
      keywords: ['maintenance', 'charges', 'monthly fee', 'society dues'],
    },
  ];

  for (const faq of faqs) {
    const existingFaq = await prisma.knowledgeEntry.findFirst({
      where: { businessId: business.id, question: faq.question },
    });
    if (!existingFaq) {
      await prisma.knowledgeEntry.create({
        data: {
          ...faq,
          businessId: business.id,
        },
      });
    }
  }
  console.log('📚 Knowledge Base FAQs seeded.');

  // 6. Seed Sample Leads
  const leadsData = [
    {
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      email: 'rahul.sharma@example.com',
      source: 'Voice Inbound',
      preferredLanguage: 'en',
      status: LeadStatus.QUALIFIED,
      notes: 'Demo data: Looking for ready-to-move 3 BHK in Whitefield near ITPL. Budget around 1.5 Cr.',
      contactConsent: true,
      doNotCall: false,
      requirements: {
        propertyType: 'Apartment',
        transactionType: TransactionType.BUY,
        location: 'Whitefield',
        budgetMin: 12000000,
        budgetMax: 15000000,
        timeline: 'Immediate',
        bedrooms: 3,
        isQualified: true,
        missingFields: [],
        rawNotes: 'Working at SAP Labs, needs 2 car parkings.',
      },
    },
    {
      name: 'Priya Nair',
      phone: '+91 98123 45678',
      email: 'priya.nair@example.com',
      source: 'Web Chat',
      preferredLanguage: 'hi',
      status: LeadStatus.CONTACTED,
      notes: 'Demo data: Looking for 2 BHK rental apartment in Whitefield.',
      contactConsent: true,
      doNotCall: false,
      requirements: {
        propertyType: 'Apartment',
        transactionType: TransactionType.RENT,
        location: 'Whitefield',
        budgetMin: 35000,
        budgetMax: 45000,
        timeline: 'Within 1 month',
        bedrooms: 2,
        isQualified: true,
        missingFields: [],
        rawNotes: 'Moving from Pune for new tech role.',
      },
    },
    {
      name: 'Amitabh Banerjee',
      phone: '+91 99001 12233',
      email: 'amitabh.b@example.com',
      source: 'Voice Inbound',
      preferredLanguage: 'bn',
      status: LeadStatus.NEW,
      notes: 'Demo data: Inquired about luxury duplex villa in Indiranagar or Whitefield.',
      contactConsent: true,
      doNotCall: false,
      requirements: {
        propertyType: 'Villa',
        transactionType: TransactionType.BUY,
        location: 'Whitefield',
        budgetMin: 30000000,
        budgetMax: 35000000,
        timeline: '3 months',
        bedrooms: 4,
        isQualified: false,
        missingFields: ['timeline'],
        rawNotes: 'Interested in Prestige Silver Oak.',
      },
    },
  ];

  for (const lead of leadsData) {
    const existingLead = await prisma.lead.findFirst({
      where: { businessId: business.id, phone: lead.phone },
    });
    if (!existingLead) {
      const createdLead = await prisma.lead.create({
        data: {
          businessId: business.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          preferredLanguage: lead.preferredLanguage,
          status: lead.status,
          notes: lead.notes,
          contactConsent: lead.contactConsent,
          doNotCall: lead.doNotCall,
          requirements: {
            create: lead.requirements,
          },
        },
      });

      // Add a scheduled demo callback for Rahul Sharma
      if (lead.name === 'Rahul Sharma') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(11, 0, 0, 0);

        await prisma.callback.create({
          data: {
            businessId: business.id,
            leadId: createdLead.id,
            assignedUserId: operatorUser.id,
            requestedTime: tomorrow,
            timezone: 'Asia/Kolkata',
            status: CallbackStatus.PENDING,
            reason: 'Site visit coordination for Sobha Dream Acres 3 BHK',
            notes: 'Client requested morning slot at 11:00 AM IST.',
            idempotencyKey: `seed_callback_${createdLead.id}`,
          },
        });
      }
    }
  }
  console.log('📋 Sample leads and demo callback seeded.');

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
