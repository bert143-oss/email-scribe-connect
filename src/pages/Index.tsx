import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { GoogleAuth } from '@/components/GoogleAuth';
import { EmailList } from '@/components/EmailList';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleAuthChange = (newUser: User | null, newAccessToken: string | null) => {
    setUser(newUser);
    setAccessToken(newAccessToken);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Gmail Access App</h1>
          <p className="text-xl text-muted-foreground">
            Securely access and view your Gmail emails
          </p>
        </div>

        <GoogleAuth onAuthChange={handleAuthChange} />
        
        {user && <EmailList accessToken={accessToken} />}
      </div>
    </div>
  );
};

export default Index;
