import React, { useEffect, useRef, useState } from "react"; // Import React and its basic helpers.

export default function App() { // Keep our small page in one component.
  const [file, setFile] = useState(null); // Remember the chosen photo.
  const [preview, setPreview] = useState(""); // Hold its local preview URL.
  const [result, setResult] = useState(null); // Hold the latest nutrition estimate.
  const [error, setError] = useState(""); // Show problems on the page.
  const [busy, setBusy] = useState(false); // Prevent duplicate API requests.
  const [camera, setCamera] = useState(false); // Track whether the camera is open.
  const [starting, setStarting] = useState(false); // Wait for camera permission.
  const video = useRef(null); // Access the video element for capture.
  const stream = useRef(null); // Keep the camera stream for cleanup.
  const mounted = useRef(true); // Track whether the page still exists.

  useEffect(() => { // Refresh the preview when the photo changes.
    if (!file) return; // Skip this until a photo is selected.
    const url = URL.createObjectURL(file); // Create a local preview without uploading.
    setPreview(url); // Display the selected photo.
    return () => URL.revokeObjectURL(url); // Release the previous photo from memory.
  }, [file]); // Run only when the photo changes.

  useEffect(() => { // Set up cleanup for leaving the page.
    mounted.current = true; // Mark the page as active.
    return () => { // Stop the camera when the component disappears.
      mounted.current = false; // Ignore late permission responses.
      stream.current?.getTracks().forEach((track) => track.stop()); // Turn off the camera.
    }; // Finish cleanup.
  }, []); // Register this once.

  function stopCamera() { // Release camera access when finished.
    stream.current?.getTracks().forEach((track) => track.stop()); // Stop all camera tracks.
    stream.current = null; // Forget the old stream.
    if (video.current) video.current.srcObject = null; // Disconnect the video element.
    setCamera(false); // Return to the photo preview.
  } // Finish cleanup.

  function choosePhoto(photo) { // Share selection logic between upload and capture.
    if (!photo) return; // Ignore a cancelled file picker.
    setError(""); // Clear the previous error.
    setResult(null); // Remove results for the previous photo.
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || !photo.size || photo.size > 8 * 1024 * 1024) { // Check format and size.
      setError("Choose a JPEG, PNG or WebP photo smaller than 8 MB."); // Explain accepted uploads.
      return; // Keep the last valid photo.
    } // Finish validation.
    stopCamera(); // Turn the camera off after choosing a photo.
    setFile(photo); // Save the image for analysis.
  } // Finish photo selection.

  async function startCamera() { // Request access only after the user clicks.
    setError(""); // Clear old errors.
    setStarting(true); // Disable other actions during the permission prompt.
    try { // Handle denied permissions or missing hardware.
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }); // Prefer a phone's rear camera.
      if (!mounted.current) { // Check whether the user left during permission approval.
        next.getTracks().forEach((track) => track.stop()); // Release a late camera stream.
        return; // Do not update a removed component.
      } // Finish the page check.
      stream.current = next; // Remember the stream.
      video.current.srcObject = next; // Connect the camera preview.
      setCamera(true); // Reveal the video.
    } catch { // Give an alternative when camera access fails.
      setError("Camera unavailable. Allow access on localhost or HTTPS, or upload a photo instead."); // Explain how to proceed.
    } finally { // Unlock the controls after either outcome.
      setStarting(false); // Finish the permission request.
    } // Finish requesting the camera.
  } // Finish camera startup.

  function capturePhoto() { // Convert a video frame into a photo.
    if (!video.current.videoWidth) { // Wait for a usable frame.
      setError("The camera is still starting. Try capturing again in a moment."); // Explain the delay.
      return; // Avoid an empty image.
    } // Finish the readiness check.
    const canvas = document.createElement("canvas"); // Make a temporary drawing surface.
    const scale = Math.min(1, 1600 / video.current.videoWidth); // Keep captures small enough to upload.
    canvas.width = Math.round(video.current.videoWidth * scale); // Set the image width.
    canvas.height = Math.round(video.current.videoHeight * scale); // Preserve the aspect ratio.
    canvas.getContext("2d").drawImage(video.current, 0, 0, canvas.width, canvas.height); // Copy the frame without mirroring it.
    canvas.toBlob((blob) => { // Encode the frame as a JPEG.
      if (blob) choosePhoto(new File([blob], "meal.jpg", { type: "image/jpeg" })); // Reuse the upload flow.
      else setError("Could not capture this frame. Try again."); // Explain a failed conversion.
    }, "image/jpeg", 0.9); // Use a reasonable quality setting.
  } // Finish capture.

  async function analyze() { // Send the selected image to FastAPI.
    if (!file || busy) return; // Require a photo and avoid duplicates.
    setBusy(true); // Disable analysis while waiting.
    setError(""); // Clear old errors.
    setResult(null); // Clear old nutrition values.
    const body = new FormData(); // Prepare a multipart upload.
    body.append("image", file); // Match the backend's parameter name.
    try { // Handle network and backend failures.
      const response = await fetch("/api/analyze", { method: "POST", body, signal: AbortSignal.timeout(75000) }); // Let the backend call Gemini.
      const data = await response.json(); // Read the response as JSON.
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Could not analyze this photo."); // Show readable backend errors.
      setResult(data); // Save the successful analysis.
    } catch (problem) { // Keep failures visible without crashing the page.
      setError(problem.name === "TimeoutError" ? "Analysis timed out. Try again." : problem.message === "Failed to fetch" ? "Cannot reach the backend. Make sure FastAPI is running." : problem.message); // Explain common failures.
    } finally { // Always re-enable the controls.
      setBusy(false); // Finish the request.
    } // Finish error handling.
  } // Finish analysis.

  return ( // Draw the page using simple HTML elements.
    <main> {/* Keep everything in one readable column. */}
      <header> {/* Introduce the app. */}
        <h1>Snapsnack-AI</h1> {/* Display the project name. */}
        <p>A photo of your meal. A little more about what's in it.</p> {/* Explain the idea. */}
      </header> {/* Finish the header. */}
      <section aria-labelledby="photo-heading"> {/* Group photo controls. */}
        <h2 id="photo-heading">Add a food photo</h2> {/* Label the first step. */}
        <label htmlFor="photo">Upload a photo</label> {/* Label the file input accessibly. */}
        <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || starting} onChange={(event) => { choosePhoto(event.target.files[0]); event.target.value = ""; }} /> {/* Allow selecting the same file again. */}
        <p className="hint">JPEG, PNG or WebP · up to 8 MB and 20 megapixels</p> {/* Explain file limits. */}
        <div className="buttons"> {/* Group camera buttons. */}
          {!camera && <button onClick={startCamera} disabled={busy || starting}>{starting ? "Opening camera…" : "Use camera"}</button>} {/* Ask for camera permission. */}
          {camera && <button onClick={capturePhoto}>Capture photo</button>} {/* Capture a frame. */}
          {camera && <button onClick={stopCamera}>Cancel camera</button>} {/* Allow stopping without a photo. */}
        </div> {/* Finish camera controls. */}
        <video ref={video} hidden={!camera} autoPlay playsInline muted aria-label="Live camera preview" /> {/* Keep the video mounted for its ref. */}
        {!camera && preview && <img className="preview" src={preview} alt="Selected meal to analyze" />} {/* Show the selected photo. */}
        {!camera && !preview && <div className="placeholder">Your photo will appear here.</div>} {/* Keep the empty state simple. */}
        <p className="hint">Analyzing sends this photo to Google Gemini. This app does not save your photos.</p> {/* Explain where the photo goes. */}
        <button className="primary" onClick={analyze} disabled={!file || busy || camera || starting}>{busy ? "Analyzing…" : "Analyze food"}</button> {/* Submit only when ready. */}
        <p role="status">{busy ? "Estimating the visible portion. This can take a moment." : ""}</p> {/* Announce progress. */}
        {error && <p className="error" role="alert">{error}</p>} {/* Display errors accessibly. */}
      </section> {/* Finish photo input. */}
      {result && <section aria-live="polite" aria-labelledby="result-heading"> {/* Announce the new result. */}
        <h2 id="result-heading">{result.is_food ? result.food_name : "No food identified"}</h2> {/* Handle non-food photos. */}
        {result.is_food && <p>Estimated portion: {result.portion}</p>} {/* Explain the assumed serving. */}
        {result.is_food && <p className="hint">Identification confidence: {result.confidence}</p>} {/* Show identification confidence. */}
        {result.is_food && result.nutrition && <table> {/* Use a plain table for nutrition. */}
          <caption>Estimated nutrition for the whole pictured portion</caption> {/* Specify the serving basis. */}
          <thead><tr><th scope="col">Nutrient</th><th scope="col">Amount</th></tr></thead> {/* Label both columns. */}
          <tbody> {/* Start nutrient rows. */}
            {[["Calories", "calories", "kcal"], ["Protein", "protein_g", "g"], ["Carbohydrates", "carbs_g", "g"], ["Fat", "fat_g", "g"], ["Fiber", "fiber_g", "g"]].map(([label, key, unit]) => ( // Give response fields readable labels.
              <tr key={key}><th scope="row">{label}</th><td>{Math.round(result.nutrition[key])} {unit}</td></tr> // Round rough estimates to whole numbers.
            ))} {/* Finish mapping rows. */}
          </tbody> {/* Finish the table body. */}
        </table>} {/* Finish the nutrition table. */}
        <p>{result.notes}</p> {/* Explain uncertain ingredients and portion assumptions. */}
      </section>} {/* Finish the results section. */}
      <footer>Photo-based estimates can miss ingredients and portion sizes. They are not a nutrition label or medical advice.</footer> {/* Explain the limits. */}
    </main> // Finish the page.
  ); // Finish rendering.
} // Finish the component.
