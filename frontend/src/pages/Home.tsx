import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
function Home() {
  return (
    <div className="flex flex-col items-center justify-center  gap-4">
      <h1 className="text-8xl font-bold text-primary">GuffHub</h1>
      <p className="text-lg text-muted-foreground">
        Online Chat Application
      </p>
      <div className="flex gap-4">
        <Button  variant="outline" asChild>
          <Link className="text-primary" to="/login">Login</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link className="text-primary" to="/register">Register</Link>
        </Button>
      </div>
    </div>
  );
}

export default Home;
