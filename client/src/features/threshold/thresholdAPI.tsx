import { apiClient } from "@/app/api-client";

export const thresholdAPI = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getThreshold: builder.query({
      query: () => ({
        // backend mounts threshold routes under `${BASE_PATH}/threshold`
        // the controller exposes GET /progress and POST /set
        url: "/threshold/progress",
        method: "GET",
      }),
      providesTags: ["Threshold"],
    }),

    updateThreshold: builder.mutation({
      query: (body) => ({
        url: "/threshold/set",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Threshold"],
    }),
  }),
});

export const {
  useGetThresholdQuery,
  useUpdateThresholdMutation,
} = thresholdAPI;
