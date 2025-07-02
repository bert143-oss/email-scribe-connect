import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, RefreshCw, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

interface EmailListProps {
  accessToken: string | null;
  onEmailsChange?: (emails: Email[]) => void;
}

export function EmailList({ accessToken, onEmailsChange }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const fetchEmails = async () => {
    if (!accessToken) {
      toast({
        title: "Error",
        description: "No access token available. Please sign in with Google.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-fetch', {
        body: {
          accessToken,
          maxResults: 20,
        },
      });

      if (error) {
        throw error;
      }

      const fetchedEmails = data.messages || [];
      setEmails(fetchedEmails);
      onEmailsChange?.(fetchedEmails);
      toast({
        title: "Success",
        description: `Fetched ${fetchedEmails.length} emails`,
      });
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch emails",
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

  if (!accessToken) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Mail className="h-6 w-6" />
            Gmail Access
          </CardTitle>
          <CardDescription>
            Please sign in with Google to access your emails
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
                <Mail className="h-6 w-6" />
                Your Gmail Inbox
              </CardTitle>
              <CardDescription>
                {emails.length > 0 ? `Showing ${emails.length} recent emails` : 'Click "Fetch Emails" to load your messages'}
              </CardDescription>
            </div>
            <Button 
              onClick={fetchEmails} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Fetch Emails'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email List */}
        <Card className="h-fit max-h-[600px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Messages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-y-auto max-h-[500px]">
              {emails.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No emails loaded yet. Click "Fetch Emails" to get started.
                </div>
              ) : (
                emails.map((email, index) => (
                  <div key={email.id}>
                    <div
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedEmail?.id === email.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium leading-tight line-clamp-2">
                            {email.subject}
                          </h4>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {formatDate(email.date).split(',')[0]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{email.from}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {email.snippet}
                        </p>
                      </div>
                    </div>
                    {index < emails.length - 1 && <Separator />}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Detail */}
        <Card className="h-fit max-h-[600px] overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedEmail ? 'Email Details' : 'Select an Email'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEmail ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg leading-tight">
                    {selectedEmail.subject}
                  </h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">From:</span>
                    <span className="text-muted-foreground">{selectedEmail.from}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date:</span>
                    <span className="text-muted-foreground">{formatDate(selectedEmail.date)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Preview:</h4>
                  <div className="max-h-[300px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {selectedEmail.body || selectedEmail.snippet}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select an email from the list to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}