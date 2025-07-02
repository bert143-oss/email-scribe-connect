import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyzeRequest {
  accessToken: string;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
  }>;
}

interface PrioritizedEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  gmailUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, emails }: AnalyzeRequest = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    if (!accessToken || !emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Access token and emails are required' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Prepare email data for Gemini analysis
    const emailsForAnalysis = emails.slice(0, 100).map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      snippet: email.snippet,
      body: email.body?.substring(0, 200) || email.snippet // Limit body length
    }));

    const prompt = `Analyze these emails and categorize each by priority (high, medium, low). Consider factors like:
- Sender importance (official, work, personal)
- Subject urgency keywords
- Content importance
- Time sensitivity

Return a JSON array with each email having: id, priority, reasoning

Emails to analyze:
${JSON.stringify(emailsForAnalysis, null, 2)}

Response format:
[
  {
    "id": "email_id",
    "priority": "high|medium|low",
    "reasoning": "brief explanation"
  }
]`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error('Gemini API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze emails with Gemini' }),
        { 
          status: geminiResponse.status, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from Gemini');
    }

    // Parse Gemini response
    let analysisResults;
    try {
      // Extract JSON from response (remove any markdown formatting)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      analysisResults = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText);
      throw new Error('Invalid response format from Gemini');
    }

    // Combine original email data with analysis results
    const prioritizedEmails: PrioritizedEmail[] = emails.map(email => {
      const analysis = analysisResults.find((result: any) => result.id === email.id);
      return {
        ...email,
        priority: analysis?.priority || 'medium',
        reasoning: analysis?.reasoning || 'No analysis available',
        gmailUrl: `https://mail.google.com/mail/u/0/#inbox/${email.id}`
      };
    });

    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    prioritizedEmails.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );

    return new Response(
      JSON.stringify({ prioritizedEmails }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error('Error in gmail-analyze function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);