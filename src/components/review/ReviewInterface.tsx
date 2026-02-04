import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReviewInterface() {
  return (
    <Card className="m-8">
      <CardHeader>
        <CardTitle>Review Session</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          No cards currently due for review.
        </p>
        <Button variant="outline">Return to Dashboard</Button>
      </CardContent>
    </Card>
  );
}
