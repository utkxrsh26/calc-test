import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('Login attempt for email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    // Debug logging (without exposing sensitive values)
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      urlLength: supabaseUrl?.length || 0,
      urlPrefix: supabaseUrl?.substring(0, 8) || 'missing',
      hasKey: !!supabaseKey,
      keyLength: supabaseKey?.length || 0,
      keyPrefix: supabaseKey?.substring(0, 8) || 'missing',
      nodeEnv: process.env.NODE_ENV,
    })

    // Check for empty strings (which are falsy but might be set)
    if (!supabaseUrl || supabaseUrl.trim() === '' || !supabaseKey || supabaseKey.trim() === '') {
      console.error('Missing or empty Supabase environment variables', {
        urlExists: !!supabaseUrl,
        urlEmpty: supabaseUrl?.trim() === '',
        keyExists: !!supabaseKey,
        keyEmpty: supabaseKey?.trim() === '',
      })
      return NextResponse.json(
        { 
          error: 'Server configuration error: Supabase credentials are missing or empty. Please check your environment variables.',
          details: {
            missingUrl: !supabaseUrl || supabaseUrl.trim() === '',
            missingKey: !supabaseKey || supabaseKey.trim() === '',
            help: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env.local file and restart the dev server'
          }
        },
        { status: 500 }
      )
    }

    // Create a response object that we'll modify
    let response = NextResponse.json({ success: true })

    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    
    console.log('Attempting Supabase auth...')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase auth error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    if (!data.session) {
      console.error('No session created')
      return NextResponse.json(
        { error: 'No session created' },
        { status: 401 }
      )
    }

    console.log('Login successful for user:', data.user.email)

    // Create final response with user data and cookies already set
    const finalResponse = NextResponse.json({
      user: data.user,
      session: data.session,
    })

    // Copy cookies from the response object that was modified by setAll
    response.cookies.getAll().forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return finalResponse
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
