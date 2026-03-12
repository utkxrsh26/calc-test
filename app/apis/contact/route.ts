import { NextRequest, NextResponse } from 'next/server';

interface ContactData {
  contact: {
    email: string;
  };
}

export async function POST(request: NextRequest) {
  // Debug: Log environment variables (without exposing values)
  console.log('🔍 Environment Check:', {
    hasApiKey: !!process.env.FRESHWORKS_API_KEY,
    apiKeyLength: process.env.FRESHWORKS_API_KEY?.length || 0,
    hasDomain: !!process.env.FRESHWORKS_DOMAIN,
    domain: process.env.FRESHWORKS_DOMAIN || 'NOT SET',
    nodeEnv: process.env.NODE_ENV
  });

  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('❌ Failed to parse request body as JSON:', jsonError);
      return NextResponse.json(
        { 
          error: 'Invalid request body. Expected JSON format.',
          details: process.env.NODE_ENV === 'development' ? (jsonError instanceof Error ? jsonError.message : String(jsonError)) : undefined
        },
        { status: 400 }
      );
    }

    const { contact } = body as ContactData;

    console.log('📥 Received request:', {
      email: contact?.email
    });

    // Validate required fields
    if (!contact?.email) {
      console.error('❌ Missing required field: email');
      return NextResponse.json(
        { 
          error: 'Email is required'
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact.email)) {
      console.error('❌ Invalid email format:', contact.email);
      return NextResponse.json(
        { 
          error: 'Invalid email format'
        },
        { status: 400 }
      );
    }

    // Get Freshworks CRM credentials from environment variables
    const freshworksApiKey = process.env.FRESHWORKS_API_KEY;
    const freshworksDomain = process.env.FRESHWORKS_DOMAIN;

    if (!freshworksApiKey || !freshworksDomain) {
      console.error('Freshworks CRM credentials not configured');
      console.error('FRESHWORKS_API_KEY:', freshworksApiKey ? 'Set (length: ' + freshworksApiKey.length + ')' : 'Not set');
      console.error('FRESHWORKS_DOMAIN:', freshworksDomain || 'Not set');
      return NextResponse.json(
        { error: 'Freshworks CRM API not configured. Please set FRESHWORKS_API_KEY and FRESHWORKS_DOMAIN environment variables.' },
        { status: 500 }
      );
    }

    // Create contact with email only
    const contactData = {
      contact: {
        email: contact.email,
      }
    };

    console.log('📤 Creating contact with email:', contact.email);

    // Make API call to Freshworks CRM
    const crmResponse = await fetch(
      `https://${freshworksDomain}/crm/sales/api/contacts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token token=${freshworksApiKey}`,
        },
        body: JSON.stringify(contactData),
      }
    );

    const crmResponseText = await crmResponse.text();

    let responseData;
    try {
      responseData = JSON.parse(crmResponseText);
    } catch (err) {
      console.error('Failed to parse contact response as JSON:', err);
      responseData = crmResponseText;
    }

    if (!crmResponse.ok) {
      console.error('Freshworks CRM API error:', responseData);

      // Extract a more user-friendly error message
      let errorMessage = 'Failed to create contact in Freshworks CRM';
      if (responseData.errors?.message) {
        if (Array.isArray(responseData.errors.message)) {
          errorMessage = responseData.errors.message[0] || errorMessage;
        } else {
          errorMessage = responseData.errors.message || errorMessage;
        }
      }

      return NextResponse.json(
        { 
          error: `Failed to create contact: ${errorMessage}`,
          details: `Email: ${contact.email}`
        },
        { status: crmResponse.status }
      );
    }

    const contactId = responseData.contact?.id || responseData.id;

    console.log(`✅ Created contact with email: ${contact.email}`);

    // Send welcome email
    try {
      const emailResponse = await fetch(
        `https://${freshworksDomain}/api/contacts/${contactId}/send_mail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token token=${freshworksApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contact.email,
            subject: 'Welcome to Codity!',
            content: `Hi,<br><br>Thank you for contacting Codity. We'll get back to you soon!`
          })
        }
      );

      console.log('✅ Welcome email sent to:', contact.email);
    } catch (emailError) {
      console.log(`❌ Failed to send welcome email to ${contact.email}:`, emailError);
    }

    console.log('✅ Contact created successfully in Freshworks CRM:', {
      contactId: contactId,
      email: contact.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Contact created successfully',
        contactId: contactId,
        summary: {
          email: contact.email
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : String(error);
    console.error('Full error details:', { message: errorMessage, stack: errorStack });
    
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack,
          type: error instanceof Error ? error.constructor.name : typeof error
        } : undefined
      },
      { status: 500 }
    );
  }
}
