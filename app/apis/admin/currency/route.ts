import { NextResponse } from 'next/server';

const CURRENCY_KEY = 'app_currency_preference';

// In-memory storage (you can replace this with a database or localStorage)
let currencyPreference: 'USD' | 'INR' = 'USD';

export async function GET() {
  try {
    return NextResponse.json({ 
      currency: currencyPreference,
      success: true 
    });
  } catch (error) {
    console.error('Error fetching currency:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currency preference' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { currency } = await request.json();
    
    if (currency !== 'USD' && currency !== 'INR') {
      return NextResponse.json(
        { error: 'Invalid currency. Must be USD or INR' },
        { status: 400 }
      );
    }

    currencyPreference = currency;
    
    return NextResponse.json({ 
      currency: currencyPreference,
      success: true 
    });
  } catch (error) {
    console.error('Error updating currency:', error);
    return NextResponse.json(
      { error: 'Failed to update currency preference' },
      { status: 500 }
    );
  }
}
