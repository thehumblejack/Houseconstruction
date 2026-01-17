import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, projectName, inviteLink, inviterName } = await req.json()

    console.log('Received request:', { email, projectName, inviteLink, inviterName })
    console.log('BREVO_API_KEY exists:', !!BREVO_API_KEY)

    if (!email || !projectName || !inviteLink) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY is not set!')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send email using Brevo
    console.log('Sending email to Brevo API...')
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'HouseConstruction',
          email: 'hamzahadjtaieb@gmail.com'
        },
        to: [
          {
            email: email,
            name: email.split('@')[0]
          }
        ],
        subject: `Invitation au projet ${projectName}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1e293b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🏗️ HouseConstruction</h1>
                </div>
                <div class="content">
                  <h2>Invitation au projet</h2>
                  <p>Bonjour,</p>
                  <p>${inviterName || 'Un membre de l\'équipe'} vous a invité à rejoindre le projet <strong>${projectName}</strong> sur HouseConstruction.</p>
                  <p>Cliquez sur le bouton ci-dessous pour accepter l'invitation :</p>
                  <div style="text-align: center;">
                    <a href="${inviteLink}" class="button">Accepter l'invitation</a>
                  </div>
                  <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
                    Ou copiez ce lien dans votre navigateur :<br>
                    <code style="background: #e2e8f0; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 5px;">${inviteLink}</code>
                  </p>
                  <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">
                    Cette invitation expire dans 7 jours.
                  </p>
                </div>
                <div class="footer">
                  <p>HouseConstruction - Gestion de projets de construction</p>
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    const data = await res.json()
    console.log('Brevo API response status:', res.status)
    console.log('Brevo API response data:', data)

    if (!res.ok) {
      console.error('Brevo API error:', data)
      throw new Error(data.message || JSON.stringify(data))
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
