import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, ExternalLink, User, Calendar, AlertTriangle, AlertCircle, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

interface PrioritizedEmailsProps {
  accessToken: string | null;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
  }>;
}

export function PrioritizedEmails({ accessToken, emails }: PrioritizedEmailsProps) {
  const [prioritizedEmails, setPrioritizedEmails] = useState<PrioritizedEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const analyzeEmails = async () => {
    if (!accessToken || emails.length === 0) {
      toast({
        title: "Error",
        description: "No emails available to analyze. Please fetch emails first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-analyze', {
        body: {
          accessToken,
          emails: emails.slice(0, 100),
        },
      });

      if (error) {
        throw error;
      }

      setPrioritizedEmails(data.prioritizedEmails || []);
      setAnalyzed(true);
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.prioritizedEmails?.length || 0} emails and categorized by priority`,
      });
    } catch (error: any) {
      console.error('Error analyzing emails:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze emails with Gemini",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Minus className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (!accessToken) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="h-6 w-6" />
            AI Email Prioritization
          </CardTitle>
          <CardDescription>
            Please sign in with Google to analyze your emails
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                AI Email Prioritization
              </CardTitle>
              <CardDescription>
                {analyzed 
                  ? `Analyzed ${prioritizedEmails.length} emails` 
                  : `Ready to analyze ${Math.min(emails.length, 100)} emails with Gemini AI`
                }
              </CardDescription>
            </div>
            <Button 
              onClick={analyzeEmails} 
              disabled={loading || emails.length === 0}
              className="flex items-center gap-2"
            >
              <Brain className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
              {loading ? 'Analyzing...' : 'Analyze Priority'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {analyzed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prioritized Emails</CardTitle>
            <CardDescription>
              Emails categorized by priority using AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {prioritizedEmails.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No emails analyzed yet.
                </div>
              ) : (
                prioritizedEmails.map((email, index) => (
                  <div key={email.id}>
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(email.priority)}
                            <Badge variant={getPriorityColor(email.priority)}>
                              {email.priority.toUpperCase()}
                            </Badge>
                            <h4 className="font-medium leading-tight line-clamp-1 flex-1">
                              {email.subject}
                            </h4>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{email.from}</span>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span>{formatDate(email.date)}</span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {email.snippet}
                          </p>
                          
                          <div className="bg-muted/50 p-2 rounded text-xs">
                            <strong>AI Reasoning:</strong> {email.reasoning}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(email.gmailUrl, '_blank')}
                          className="flex items-center gap-1 flex-shrink-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open in Gmail
                        </Button>
                      </div>
                    </div>
                    {index < prioritizedEmails.length - 1 && <Separator />}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}