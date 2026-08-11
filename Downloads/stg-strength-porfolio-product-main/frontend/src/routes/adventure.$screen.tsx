import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/adventure/$screen")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/seikkailu/$screen",
      params: { screen: params.screen },
      replace: true,
    });
  },
});
