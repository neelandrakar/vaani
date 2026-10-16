import { PrismaClient, Role, LeadStatus, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function updateToHoichoi() {
  console.log('🎬 Updating business and agent config to Hoichoi (Vaani)...');

  // 1. Find or update the primary business config
  let business = await prisma.businessConfig.findFirst();

  const businessData = {
    name: 'Hoichoi',
    legalName: 'Hoichoi Technologies Private Limited',
    industry: 'Digital Entertainment & OTT Streaming',
    timezone: 'Asia/Kolkata',
    phone: '+91 33 4000 7700',
    email: 'support@hoichoi.tv',
    address: 'Acropolis Mall, 1858/1 Rajdanga Main Road, Kolkata, West Bengal 700107, India',
  };

  if (!business) {
    business = await prisma.businessConfig.create({
      data: businessData,
    });
  } else {
    business = await prisma.businessConfig.update({
      where: { id: business.id },
      data: businessData,
    });
  }

  console.log(`✅ Business updated: ${business.name} (${business.id})`);

  // 2. The exact prompt provided by the user
  const hoichoiPrompt = `You are Vaani, a smart, insightful female AI calling assistant representing Hoichoi.

Your role is to help people through useful conversations and help businesses understand customers, discover suitable leads, look up sales information, and turn genuine interest into clear next steps.

PERSONALITY
You are warm, confident, observant, and commercially sharp. You have the friendliness of a helpful colleague and the judgment of an experienced sales consultant.
You listen carefully, notice relevant details, and ask thoughtful questions. You are persuasive without being pushy, confident without being arrogant, and friendly without becoming overly familiar.
Your intelligence shows through your understanding, relevant insights, and practical suggestions. Avoid showing off or overwhelming people with information.

VOICE AND CONVERSATION STYLE
- Speak naturally using short, clear sentences suitable for a phone conversation.
- Keep most responses to one or two sentences, then allow the caller to respond.
- Ask one question at a time.
- Match the caller’s language and level of formality. Use English, Hindi, Bengali, or mixed language only when supported by your configured speech capabilities.
- Use natural, respectful Indian phrasing where appropriate, without forced slang or repeatedly saying “sir” or “ma’am.”
- Avoid scripted enthusiasm, repetitive acknowledgments, jargon, and long monologues.
- Let the caller finish. If interrupted, stop speaking and address what they said.
- If speech is unclear, ask for clarification instead of guessing.
- Read phone numbers, amounts, dates, and names clearly. Confirm critical details.

IDENTITY AND OPENING
Introduce yourself as Vaani, an AI calling assistant from Hoichoi. Explain the purpose of the call briefly and check whether it is a convenient time.
Example:
“Hello, I’m Vaani, the AI calling assistant from Hoichoi. I’m calling about your subscription and our latest releases. Is this a good time for a quick conversation?”
Never pretend to be human. If asked about your identity or capabilities, answer directly and honestly.

CORE CAPABILITIES
1. Sales lookup and insights: Use authorized tools to retrieve relevant sales records, customer history, product information, availability, and approved pricing. Explain the answer first, then share the most useful insight. Clearly distinguish verified facts from your interpretation.
2. Lead discovery and qualification: Find potential leads using approved sources and tools. Naturally learn about the prospect’s needs, viewing habits, preferred devices, timeline, and budget. Ask one detail at a time.
3. Consultative persuasion: Understand the prospect’s entertainment preferences before recommending anything. Connect relevant verified content benefits (like 1080p Full HD, offline downloads, multi-screen access) to what they enjoy.
When handling objections:
- Acknowledge the concern.
- Ask a brief clarifying question if needed.
- Give a relevant, factual response.
- Offer a practical next step.
Never invent discounts, scarcity, testimonials, or guaranteed outcomes. Treat “not now” as a timing preference and a clear “no” as a decision to respect.
4. Next steps and follow-up: Move interested conversations toward a useful outcome, such as an annual subscription confirmation, callback appointment, or human handoff. Confirm the agreed action and any relevant date, time, timezone, and contact details.

TOOLS, ACCURACY, AND AUTHORITY
- Use connected tools for live information: get_business_information, update_lead_requirements, create_callback, request_human_assistance, finish_conversation.
- Never fabricate plans, prices, availability, or tool results.
- Never say an appointment is booked or a record updated until the tool confirms success.
- If information is missing, explain briefly and offer a human callback.
- Offer a human handoff when requested.

CALL OUTCOMES
At the end of a call, briefly recap what was agreed and close warmly.
Internal summary should contain: purpose, confirmed needs, questions/objections, outcome, agreed next action, and any opt-out request.`;

  // 3. Upsert Agent Configuration
  const agentConfig = await prisma.agentConfig.upsert({
    where: { businessId: business.id },
    update: {
      name: 'Vaani',
      introduction: 'Hello, I’m Vaani, the AI calling assistant from Hoichoi. I’m calling about your subscription and our latest releases. Is this a good time for a quick conversation?',
      fallbackMessage: 'I apologize, but I do not have verified information on that right now. Let me connect you with our customer support specialist.',
      supportedLanguages: ['en', 'hi', 'bn'],
      voiceGender: 'female',
      qualificationPrompt: hoichoiPrompt,
      escalationRules: 'Escalate to a human executive if the customer has billing questions, technical streaming issues, requests a human explicitly, or needs high-level assistance.',
    },
    create: {
      businessId: business.id,
      name: 'Vaani',
      introduction: 'Hello, I’m Vaani, the AI calling assistant from Hoichoi. I’m calling about your subscription and our latest releases. Is this a good time for a quick conversation?',
      fallbackMessage: 'I apologize, but I do not have verified information on that right now. Let me connect you with our customer support specialist.',
      supportedLanguages: ['en', 'hi', 'bn'],
      voiceGender: 'female',
      qualificationPrompt: hoichoiPrompt,
      escalationRules: 'Escalate to a human executive if the customer has billing questions, technical streaming issues, requests a human explicitly, or needs high-level assistance.',
    },
  });

  console.log(`✅ Agent config updated: ${agentConfig.name} representing ${business.name}`);

  // 4. Update Knowledge Base with Hoichoi verified plans and FAQs
  // Deactivate old real-estate specific FAQs
  await prisma.knowledgeEntry.updateMany({
    where: { businessId: business.id },
    data: { isActive: false },
  });

  const hoichoiFaqs = [
    {
      category: 'Pricing',
      question: 'What are the subscription plans and pricing for Hoichoi?',
      answer: 'Hoichoi offers two popular plans: the Annual Plan at ₹899/year for 2 simultaneous screens in Full HD (1080p), and the Monthly Plan at ₹199/month. We also offer an International Annual Plan for global viewers.',
      keywords: ['pricing', 'cost', 'plan', 'subscription', 'price', 'annual', 'monthly', 'rate', '899', '199', 'how much'],
    },
    {
      category: 'Content',
      question: 'What original web series and movies are available on Hoichoi?',
      answer: 'Hoichoi hosts over 150 original series and 600+ movies including popular hits like Byomkesh, Feluda, Eken Babu, Karagar, Mandaar, Indubala Bhaater Hotel, Mohanagar, and Taqdeer. Selected titles are also dubbed in Hindi.',
      keywords: ['shows', 'movies', 'series', 'originals', 'feluda', 'byomkesh', 'eken babu', 'karagar', 'content', 'bengali', 'hindi'],
    },
    {
      category: 'Features',
      question: 'What devices and video quality does Hoichoi support?',
      answer: 'Hoichoi supports 1080p Full HD video streaming with Dolby audio on Android, iOS, Apple TV, Fire TV, Android TV, Roku, Samsung & LG Smart TVs, and web browsers. Offline downloads are supported on mobile apps.',
      keywords: ['devices', 'tv', 'mobile', 'quality', 'hd', 'offline', 'download', 'screens', 'supported'],
    },
    {
      category: 'Policy',
      question: 'Can I cancel my Hoichoi subscription anytime?',
      answer: 'Yes, you can cancel auto-renewal at any time from your account settings without any cancellation fees. You will continue to enjoy full access until your current paid billing period ends.',
      keywords: ['cancellation', 'cancel', 'refund', 'auto-renewal', 'billing', 'policy'],
    },
    {
      category: 'Renewal',
      question: 'How do I renew or upgrade my Hoichoi subscription?',
      answer: 'You can renew or upgrade easily via UPI, Credit/Debit cards, or NetBanking. Our team can also send a secure payment link directly to your verified phone number or email.',
      keywords: ['upgrade', 'renew', 'payment', 'upi', 'card', 'discount', 'offer'],
    },
  ];

  for (const faq of hoichoiFaqs) {
    await prisma.knowledgeEntry.create({
      data: {
        ...faq,
        businessId: business.id,
        isActive: true,
      },
    });
  }
  console.log('✅ Hoichoi Knowledge Base FAQs seeded.');

  // 5. Seed Hoichoi Leads
  const hoichoiLeads = [
    {
      name: 'Sourav Chatterjee',
      phone: '+91 98301 22334',
      email: 'sourav.chatterjee@example.com',
      source: 'Website Inbound',
      preferredLanguage: 'bn',
      status: LeadStatus.QUALIFIED,
      notes: 'Interested in Annual VIP Plan renewal. Watches Byomkesh and Bengali crime thrillers on Smart TV.',
      contactConsent: true,
      doNotCall: false,
    },
    {
      name: 'Priya Mukherjee',
      phone: '+91 98450 77889',
      email: 'priya.mukherjee@example.com',
      source: 'Mobile App Sign-up',
      preferredLanguage: 'en',
      status: LeadStatus.NEW,
      notes: 'New subscriber inquiry. Looking for multi-screen family streaming for parents in Kolkata.',
      contactConsent: true,
      doNotCall: false,
    },
    {
      name: 'Rahul Verma',
      phone: '+91 98112 55667',
      email: 'rahul.verma@example.com',
      source: 'Ad Campaign',
      preferredLanguage: 'hi',
      status: LeadStatus.CONTACTED,
      notes: 'Interested in Hindi-dubbed Bengali thriller series (Karagar, Mohanagar). Budget conscious.',
      contactConsent: true,
      doNotCall: false,
    },
    {
      name: 'Anirban Sen',
      phone: '+91 98200 44332',
      email: 'anirban.sen@example.com',
      source: 'Voice Inbound',
      preferredLanguage: 'bn',
      status: LeadStatus.NEW,
      notes: 'Frequent traveler inquiring about offline downloads on iPad and international streaming access.',
      contactConsent: true,
      doNotCall: false,
    },
  ];

  for (const lead of hoichoiLeads) {
    const existing = await prisma.lead.findFirst({
      where: { businessId: business.id, phone: lead.phone },
    });
    if (!existing) {
      await prisma.lead.create({
        data: {
          ...lead,
          businessId: business.id,
        },
      });
    }
  }

  console.log('✅ Hoichoi leads seeded successfully.');
}

updateToHoichoi()
  .catch((e) => {
    console.error('Error updating to Hoichoi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
