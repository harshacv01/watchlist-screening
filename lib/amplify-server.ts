import { createServerRunner } from "@aws-amplify/adapter-nextjs"

import { amplifyConfig } from "@/lib/amplify"

export const { runWithAmplifyServerContext } = createServerRunner({
  config: amplifyConfig,
})
