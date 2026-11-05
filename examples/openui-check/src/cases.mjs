// Two questions with real-looking data: one the router sends to charts, one it sends to a graph.
export const cases = [
  {
    id: "compare-variants",
    useCase: "examples/comparative-variants.json",
    question: `Compare our four checkout page variants. Which one should we ship?
Data (two weeks, ~12,000 sessions each):
- Variant A (control): conversion 3.1%, average order $54, bounce 41%
- Variant B (one-page): conversion 3.6%, average order $51, bounce 37%
- Variant C (trust badges): conversion 3.3%, average order $56, bounce 40%
- Variant D (express pay first): conversion 3.9%, average order $49, bounce 35%`
  },
  {
    id: "failure-propagation",
    useCase: "examples/failure-propagation.json",
    question: `If the auth-db goes down, what else fails and in what order?
Dependencies (X depends on Y means X fails when Y fails):
- auth-service depends on auth-db
- session-cache depends on auth-service
- api-gateway depends on auth-service
- api-gateway depends on session-cache
- checkout depends on api-gateway
- checkout depends on payments
- payments depends on fraud-check
- search depends on api-gateway
- search depends on search-index
- admin-console depends on auth-service
- notifications depends on checkout
- reporting depends on admin-console`,
    // Ground truth for the graph check: every "X depends on Y" line as source X, target Y.
    expectedEdges: "auth-service>auth-db session-cache>auth-service api-gateway>auth-service api-gateway>session-cache checkout>api-gateway checkout>payments payments>fraud-check search>api-gateway search>search-index admin-console>auth-service notifications>checkout reporting>admin-console".split(" ")
  }
];
