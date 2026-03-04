const axios = require('axios');

const COOKIES = `abIDV2=893; anonID=8c30d92cb7cb85f9; premium=false; acceptedPremiumModesTnc=false; qdid=203b3858ee71e7477e699760e9b348f3; qb_anon_id=185c7eae6809571ea569e43dd7bd8b1b8f4b051f808c98b462dd7b5e4a361b2e.73a57ea17f9f75cbd388d27b417af22349c1bd8f65829e872d2db8cecab314c7; qbDeviceId=00d988ae-8a4f-4b37-9c43-87f81a4fdd64; AMP_MKTG_6e403e775d=JTdCJTdE; g_state={"i_l":0,"i_ll":1772618942686,"i_b":"Qh3BoLs1thysn78QYfWVc9vWwS+ChXlBxFRHb3SFuRc","i_e":{"enable_itp_optimization":0}}; authenticated=true; connect.sid=s%3AoVZjdVK_XJ93lybjFZ2dmVQJsjlwi1Fz.zUxMxFZVW2S%2BDllQ9RbTbvxjB%2BEVSPQYzCxsoGfYXGw; __cf_bm=3ng6CBWTNquDi4BZbkUGm5irN40d834asykR.okF75s-1772651928-1.0.1.1-K7MdBg1h8pEwuo3U0ftligDfDt7wWj.XrauoBJpPnUxIdQcVG4mqovnftX.oqZAqKDPP1gpdFnSHxTVjLlPcpas_EHbEHp62HSD2JvPO1W8; _sp_ses.48cd=*; useridtoken=eyJhbGciOiJSUzI1NiIsImtpZCI6IjJhYWM0MWY3NTA4OGZlOGUwOWEwN2Q0NDRjZmQ2YjhjZTQ4MTJhMzEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiU2tpcHB5ek5KSWYiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jTDNKTXpKN3FiZndyNE00UG1MaWh2bmhYY0RlUG83ZHppSkNncjEyLS1pbGxmbUljNXg9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcGFyYXBocmFzZXItNDcyYzEiLCJhdWQiOiJwYXJhcGhyYXNlci00NzJjMSIsImF1dGhfdGltZSI6MTc3MjYxODk1MiwidXNlcl9pZCI6IkVuanF4SVpUWGhYS09HN3N4bWw1ajllWjByajEiLCJzdWIiOiJFbmpxeElaVFhoWEtPRzdzeG1sNWo5ZVowcmoxIiwiaWF0IjoxNzcyNjUxOTI4LCJleHAiOjE3NzI2NTU1MjgsImVtYWlsIjoicG9wdWxhcm1tb3M1MjMyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTA0ODM4MjgyOTc3NDkxNTExMzU2Il0sImVtYWlsIjpbInBvcHVsYXJtbW9zNTIzMkBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.M39A1SNMBGjCFFhv88VD9RkOy4eys1HPpIx6fw5vRwrWGe9-Crb_yMH9N9RczSQPL_DtjeIH9UXXZ6dYf4eYF45s11qV-OhQXe0SD-eChtSKKkgHsR1lmZoYubJ2q4R_amUiWjV6iIwatmq_mez8Z_uvjr3k-B_fiUP7sJI7PklRSTE_XhVf2glLAESlZrUUaaFBAI-U-LIofI59Rlnt5wHSHBpm6Uvruw2jAkM_iJCZKqa30Ki0N-s2yNcRfTx8j3KEQLoHSqDHK2JFRBu4CdB6GRNyicvxblRdw7KQSmWkXJbUpsCaObfu75NPc2f94UehYIcWTIGXxZcldwpRvw; _sp_id.48cd=2a8b16e7-1940-484d-87b4-4a58951ad004.1767154283.4.1772652219.1772620540.37b70b40-d821-4c8a-b871-895197c52c4e.2fe22e99-940a-4c2e-a318-4a314da385da.8f02c342-9504-4ec7-9eae-b82abdbc6509.1772651927782.44; AMP_6e403e775d=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjIwMGQ5ODhhZS04YTRmLTRiMzctOWM0My04N2Y4MWE0ZmRkNjQlMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJFbmpxeElaVFhoWEtPRzdzeG1sNWo5ZVowcmoxJTIyJTJDJTIyc2Vzc2lvbklkJTIyJTNBMTc3MjY1MTk1NjYyNyUyQyUyMm9wdE91dCUyMiUzQWZhbHNlJTJDJTIybGFzdEV2ZW50VGltZSUyMiUzQTE3NzI2NTIyNTk2MTMlMkMlMjJsYXN0RXZlbnRJZCUyMiUzQTM1NSU3RA==`;

const text = "This is a longer test sentence to ensure we pass the character limit requirements and can actually get a valid score back from the detection engines. The quick brown fox jumps over the lazy dog repeatedly until it is tired. Hopefully this text is sufficient for the engines to analyze and return a proper JSON response rather than a bad response error.";

async function test() {
  try {
    const response = await axios.post("https://quillbot.com/api/ai-detector/score", 
      { text, language: "en", explain: false },
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.8",
          "content-type": "application/json",
          origin: "https://quillbot.com",
          "platform-type": "webapp",
          "qb-product": "AI_CONTENT_DETECTOR",
          referer: "https://quillbot.com/ai-content-detector",
          "sec-ch-ua": '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
          cookie: COOKIES
        },
        timeout: 20000,
        validateStatus: () => true
      }
    );

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
