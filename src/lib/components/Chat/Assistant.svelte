<script lang="ts">
  import { onMount, afterUpdate, tick, onDestroy } from "svelte";
  import { fade, slide, scale, fly } from "svelte/transition";
  import { quintOut, backOut } from "svelte/easing";
  import ChatMessage from "$lib/components/Chat/ChatMessage.svelte";
  import { getCreditFromQuery, agentOptions, agentCategory } from "$lib/utils";
  import X from "lucide-svelte/icons/x";
  import Plus from "lucide-svelte/icons/plus";
  import History from "lucide-svelte/icons/history";
  import ArrowUp from "lucide-svelte/icons/arrow-up";
  import Spark from "lucide-svelte/icons/sparkles";

  import { EditorState, Plugin } from "prosemirror-state";
  import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
  import { keymap } from "prosemirror-keymap";
  import { schema } from "prosemirror-schema-basic";
  import { browser } from "$app/environment";

  export let userData = null;

  // Window state
  let isOpen = false;
  let isMinimized = false;
  let isFullscreen = false;

  // Chat state
  let messages = [
    {
      content:
        "Hello! I'm your AI assistant. How can I help you with stock market analysis today?",
      role: "system",
    },
  ];
  let relatedQuestions = [];
  let chatId = null;
  let isLoading = false;
  let isStreaming = false;

  // Editor state
  let editorDiv;
  let editorView;
  let editorText = "";
  let suggestions = [];
  let showSuggestions = false;
  let suggestionPos = { top: 0, left: 0 };
  let selectedSuggestion = 0;
  let currentQuery = "";

  // UI refs
  let chatContainer: HTMLDivElement;
  let bottomEl: HTMLDivElement;
  let chatWindow: HTMLDivElement;

  // Drag state (kept but panel is docked right by default)
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let windowX = 20;
  let windowY = 20;

  // Stream handling
  let saveTimeout = null;
  let lastSavedContent = "";
  let animationFrameId = null;
  let pendingContent = "";

  // Message editing
  let editingMessageIndex: number | null = null;

  let agentNames = agentOptions?.map((item) => item?.name) ?? [];

  // --- editor plugins & helpers (kept from your original) ---
  function agentMentionDeletePlugin(agentNames: string[]) {
    return keymap({
      Backspace: (state, dispatch, view) => {
        const { $cursor } = state.selection as any;
        if (!$cursor) return false;
        const { pos } = $cursor;
        const textBefore = state.doc.textBetween(
          Math.max(0, pos - 30),
          pos,
          "\n",
          "\n",
        );
        const regex = /\@([a-zA-Z0-9_]+)$/;
        const match = regex.exec(textBefore);
        if (match && agentNames?.includes(match[1])) {
          const start = pos - match[0].length;
          if (dispatch) dispatch(state.tr.delete(start, pos));
          return true;
        }
        return false;
      },
      Delete: (state, dispatch, view) => {
        const { $cursor } = state.selection as any;
        if (!$cursor) return false;
        const { pos } = $cursor;
        const textAfter = state.doc.textBetween(
          pos,
          Math.min(pos + 30, state.doc.content.size),
          "\n",
          "\n",
        );
        const regex = /^\@([a-zA-Z0-9_]+)/;
        const match = regex.exec(textAfter);
        if (match && agentNames?.includes(match[1])) {
          const end = pos + match[0].length;
          if (dispatch) dispatch(state.tr.delete(pos, end));
          return true;
        }
        return false;
      },
    });
  }

  const editorHighlighter = new Plugin({
    props: {
      decorations(state) {
        const decorations = [];
        const regex = /\@([a-zA-Z0-9_]+)/g;
        state.doc.descendants((node, pos) => {
          if (!node.isText) return;
          const text = node.text;
          if (!text) return;
          let match;
          while ((match = regex.exec(text)) !== null) {
            const mention = match[1];
            if (agentNames?.includes(mention)) {
              decorations.push(
                Decoration.inline(
                  pos + match.index,
                  pos + match.index + match[0]?.length,
                  {
                    class: "text-blue-800 dark:text-blue-400 font-medium",
                  },
                ),
              );
            }
          }
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });

  const placeholderPlugin = new Plugin({
    props: {
      decorations(state) {
        if (state.doc.textContent.length > 0) return null;
        const widget = Decoration.widget(1, () => {
          const span = document.createElement("span");
          span.className =
            "text-gray-600 dark:text-gray-300 pointer-events-none";
          span.textContent =
            "Ask anything about stocks, markets, or financial data...";
          return span;
        });
        return DecorationSet.create(state.doc, [widget]);
      },
    },
  });

  function getCaretCoordinates(view) {
    const { from } = view.state.selection;
    return view.coordsAtPos(from);
  }

  function checkAutocomplete(view) {
    const { from } = view.state.selection;
    const before = view.state.doc.textBetween(
      Math.max(0, from - 20),
      from,
      "\n",
      "\n",
    );
    const match = /\@([a-zA-Z0-9_]*)$/.exec(before);
    if (match) {
      currentQuery = match[1];
      suggestions = agentNames?.filter((s) =>
        s.toLowerCase().startsWith(currentQuery.toLowerCase()),
      );
      const coords = getCaretCoordinates(view);
      suggestionPos = { top: coords.bottom + 6, left: coords.left - 8 };
      showSuggestions = suggestions.length > 0;
    } else {
      showSuggestions = false;
    }
  }

  // Window controls
  function openChat() {
    isOpen = true;
    isMinimized = false;
    // focus editor after smooth transition
    setTimeout(() => editorView?.focus(), 450);
  }

  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  function minimizeChat() {
    isMinimized = !isMinimized;
  }

  function toggleFullscreen() {
    isFullscreen = !isFullscreen;
  }

  function closeChat() {
    isOpen = false;
    isMinimized = false;
    isFullscreen = false;
  }

  function newChat() {
    messages = [
      {
        content:
          "Hello! I'm your AI assistant. How can I help you with stock market analysis today?",
        role: "system",
      },
    ];
    chatId = null; // Reset chatId so next message creates new chat
    relatedQuestions = [];
    editingMessageIndex = null;
    
    if (editorView) {
      const emptyDoc = schema?.topNodeType?.createAndFill();
      const tr = editorView?.state?.tr?.replaceWith(
        0,
        editorView?.state?.doc?.content?.size,
        emptyDoc?.content,
      );
      editorView?.dispatch(tr);
      editorText = "";
    }
  }

  // Drag handling (kept, optional)
  function startDrag(e: MouseEvent) {
    if (isFullscreen) return;
    isDragging = true;
    dragStartX = e.clientX - windowX;
    dragStartY = e.clientY - windowY;
  }

  function handleDrag(e: MouseEvent) {
    if (!isDragging || isFullscreen) return;
    windowX = e.clientX - dragStartX;
    windowY = e.clientY - dragStartY;
    windowX = Math.max(
      0,
      Math.min(window.innerWidth - (chatWindow?.offsetWidth || 400), windowX),
    );
    windowY = Math.max(
      0,
      Math.min(window.innerHeight - (chatWindow?.offsetHeight || 600), windowY),
    );
  }

  function stopDrag() {
    isDragging = false;
  }

  // Chat functionality - complete workflow like main chat
  async function llmChat(userMessage?: string) {
    if (isLoading || isStreaming) return;
    
    const userQuery = userMessage || editorText?.trim();
    if (!userQuery || userQuery?.length < 1) return;

    // Step 1: Create chat if we don't have a chatId (like /chat/+page.svelte)
    if (!chatId) {
      await createChatSession(userQuery);
      return;
    }

    // Step 2: Continue existing chat (like /chat/[slug]/+page.svelte)
    await continueChat(userQuery, userMessage);
  }

  // Create new chat session (like createChat in /chat/+page.svelte)
  async function createChatSession(userQuery: string) {
    if (isLoading) return;
    
    isLoading = true;

    // Check user credits (same as main chat)
    if (userData?.credits < 2) {
      // Would show toast in real implementation, but keeping simple for now
      console.error(`Insufficient credits. Current balance: ${userData?.credits}`);
      isLoading = false;
      return;
    }

    try {
      const response = await fetch("/api/create-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery }),
      });

      const output = await response.json();
      chatId = output.id; // Set the PocketBase ID

      // Now continue with the actual chat
      await continueChat(userQuery, null);
    } catch (error) {
      console.error("Failed to create chat:", error);
      isLoading = false;
    }
  }

  // Continue chat conversation (like llmChat in /chat/[slug]/+page.svelte)
  async function continueChat(userQuery: string, userMessage?: string) {
    isLoading = true;
    isStreaming = true;
    relatedQuestions = [];

    // Clear editor
    if (editorView) {
      const emptyDoc = schema?.topNodeType?.createAndFill();
      const tr = editorView?.state?.tr?.replaceWith(
        0,
        editorView?.state?.doc?.content?.size,
        emptyDoc?.content,
      );
      editorView?.dispatch(tr);
      editorText = "";
    }

    // Add user message if not already in messages
    if (!userMessage) {
      messages = [...messages, { content: userQuery, role: "user" }];
    }

    // Add placeholder for assistant response
    messages = [...messages, { content: "", role: "system" }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userQuery, chatId: chatId }),
      });

      if (!res.ok || !res.body) {
        messages = messages.slice(0, -1);
        const errorMessage = (await res?.json())?.error || "Unknown error";
        messages = [...messages, { content: errorMessage, role: "system" }];
        isLoading = false;
        isStreaming = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const idx = messages.length - 1;
      let assistantText = "";
      let updateBuffer = [];
      let batchTimeout = null;
      let sourcesCollected = [];

      isLoading = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line?.trim()) continue;

          try {
            const json = JSON.parse(line);

            if (json.error) {
              console.error("Stream error:", json.error);
              break;
            }

            // Handle sources event
            if (json?.event === "sources" && json?.sources) {
              sourcesCollected = json.sources;
              if (messages[idx]) {
                messages[idx].sources = sourcesCollected;
                messages = [...messages];
              }
            }

            // Handle related questions event
            if (json?.event === "related_questions" && json?.questions) {
              relatedQuestions = json.questions;
              if (messages[idx]) {
                messages[idx].relatedQuestions = json.questions;
                messages = [...messages];
              }
            }

            // Handle content updates
            if (json?.content) {
              assistantText = json.content;
              pendingContent = assistantText;
              updateBuffer.push(assistantText);

              if (batchTimeout) clearTimeout(batchTimeout);
              batchTimeout = setTimeout(() => {
                if (updateBuffer.length > 0) {
                  const latest = updateBuffer[updateBuffer.length - 1];
                  if (animationFrameId) cancelAnimationFrame(animationFrameId);
                  animationFrameId = requestAnimationFrame(() => {
                    messages[idx].content = latest;
                    messages = [...messages];
                    animationFrameId = null;
                  });
                  updateBuffer = [];
                }
              }, 30);

              await saveChatWithDebounce(assistantText);
            }
          } catch (err) {
            console.error("Parse error:", err, "line:", line);
          }
        }
      }

      isStreaming = false;
      if (pendingContent && messages[idx]) {
        messages[idx].content = pendingContent;
        messages = [...messages];
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      // Deduct credits
      const costOfCredit = getCreditFromQuery(userQuery, agentOptions);
      if (userData) userData.credits -= costOfCredit;

      await saveChat();
    } catch (error) {
      console.error("Chat request failed:", error);
      messages = messages.slice(0, -1);
      let errorMessage = "Failed to connect to the chat service. Please try again later.";
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        errorMessage = "Network error: Unable to reach the chat service. Please check your connection.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      messages = [...messages, { content: errorMessage, role: "system" }];
    } finally {
      isLoading = false;
      isStreaming = false;
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
    }
  }

  function handleRelatedQuestionClick(event) {
    const { question } = event.detail;
    messages = [...messages, { role: "user", content: question }];
    llmChat(question);
  }

  async function handleKeyDown(event) {
    if (showSuggestions) {
      if (event.key === "ArrowDown") {
        selectedSuggestion = (selectedSuggestion + 1) % suggestions.length;
        event.preventDefault();
      } else if (event.key === "ArrowUp") {
        selectedSuggestion =
          (selectedSuggestion - 1 + suggestions.length) % suggestions.length;
        event.preventDefault();
      } else if (event.key === "Enter") {
        insertSuggestion(suggestions[selectedSuggestion]);
        event.preventDefault();
      } else if (event.key === "Escape") {
        showSuggestions = false;
      }
    } else {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await llmChat();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeChat();
      }
    }
  }

  function insertSuggestion(suggestion) {
    const { from } = editorView.state.selection;
    const before = editorView.state.doc.textBetween(
      Math.max(0, from - 20),
      from,
      "\n",
      "\n",
    );
    const match = /\@([a-zA-Z0-9_]*)$/.exec(before);

    if (match) {
      const start = from - match[0].length;

      // First, create transaction
      const tr = editorView.state.tr.insertText(`@${suggestion} `, start, from);

      // Then set selection on the new transaction
      const resolvedPos = tr.doc.resolve(start + suggestion.length + 2);
      const newSelection =
        editorView.state.selection.constructor.near(resolvedPos);
      tr.setSelection(newSelection);

      editorView.dispatch(tr);
      showSuggestions = false;
    }
  }

  function insertAgentOption(option) {
    const { from, to } = editorView.state.selection;
    const text = `@${option} `;

    const tr = editorView.state.tr.insertText(text, from, to);
    const resolvedPos = tr.doc.resolve(from + text.length);
    const newSelection =
      editorView.state.selection.constructor.near(resolvedPos);
    tr.setSelection(newSelection);

    editorView?.dispatch(tr);
    editorView?.focus();
  }

  // rewriting/editing handlers (kept)
  async function rewriteResponse(dispatchData: any) {
    const index = dispatchData?.detail ?? null;
    if (index < 1 || index > messages?.length) return;
    editingMessageIndex = null;
    const userMessage = messages?.[index - 1]?.content;
    messages = messages?.slice(0, index);
    await llmChat(userMessage);
  }

  async function editMessage(event: any) {
    const { index, content } = event.detail;
    if (index < 0 || index >= messages?.length) return;
    editingMessageIndex = null;
    messages[index].content = content;
    messages = messages.slice(0, index + 1);
    messages = [...messages];
    await llmChat(content);
  }

  function handleStartEdit(event: any) {
    const { index } = event.detail;
    editingMessageIndex = index;
  }

  function handleCancelEdit() {
    editingMessageIndex = null;
  }

  // Saving functions (exact same as working chat)
  async function saveChatWithDebounce(assistantContent = "") {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      // Only save if content has changed
      if (assistantContent !== lastSavedContent) {
        lastSavedContent = assistantContent;
        await saveChat();
      }
    }, 2000); // Save every 2 seconds during streaming
  }

  async function saveChat() {
    const postData = { messages: messages, chatId: chatId };

    const response = await fetch("/api/update-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    });

    const output = await response?.json();
  }

  function handlePageUnload() {
    if (isStreaming && messages.length > 0) {
      const postData = JSON.stringify({ messages, chatId });
      navigator.sendBeacon(
        "/api/update-chat",
        new Blob([postData], { type: "application/json" }),
      );
    }
  }

  // lifecycle
  function initializeEditor() {
    if (!editorDiv || editorView) return;

    editorView = new EditorView(editorDiv, {
      state: EditorState.create({
        schema,
        plugins: [
          editorHighlighter,
          placeholderPlugin,
          agentMentionDeletePlugin(agentNames),
          keymap({
            "Ctrl-Enter": () => {
              if (editorText?.trim()) {
                llmChat();
                return true;
              }
              return false;
            },
            Enter: () => {
              if (editorText?.trim()) {
                llmChat();
                return true;
              }
              return false;
            },
            Escape: () => {
              closeChat();
              return true;
            },
          }),
        ],
      }),
      attributes: {
        style: "outline: none !important; border: none !important;",
      },
      dispatchTransaction(transaction) {
        const newState = editorView.state.apply(transaction);
        editorView.updateState(newState);
        editorText = editorView?.state.doc?.textContent || "";
        checkAutocomplete(editorView);
      },
    });

    // Force remove outline after creation (same as working chat)
    const proseMirrorEl = editorDiv.querySelector(".ProseMirror");
    if (proseMirrorEl) {
      proseMirrorEl.style.outline = "none";
      proseMirrorEl.style.border = "none";
      proseMirrorEl.style.boxShadow = "none";
    }

    // Focus with small delay (same as working chat)
    setTimeout(() => {
      if (editorView) {
        editorView.focus();
        editorText = editorView.state.doc.textContent || "";
      }
    }, 100);
  }

  onMount(() => {
    if (browser) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", stopDrag);
      window.addEventListener("beforeunload", handlePageUnload);
      window.addEventListener("pagehide", handlePageUnload);
    }
  });

  afterUpdate(async () => {
    if (isStreaming && bottomEl) {
      await tick();
      bottomEl.scrollIntoView({ behavior: "smooth" });
    }

    // Initialize editor when chat opens
    if (isOpen && editorDiv && !editorView) {
      await tick(); // Wait for DOM
      initializeEditor();
    }

    // Destroy editor when chat closes
    if (!isOpen && editorView) {
      editorView.destroy();
      editorView = null;
      editorText = "";
      showSuggestions = false;
    }
  });

  onDestroy(() => {
    if (browser) {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("beforeunload", handlePageUnload);
      window.removeEventListener("pagehide", handlePageUnload);
    }
    if (editorView) editorView.destroy();
    if (saveTimeout) clearTimeout(saveTimeout);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });
</script>

<!-- Floating Open Button -->
{#if !isOpen}
  <button
    on:click|stopPropagation={openChat}
    aria-label="Open AI Assistant"
    class="fixed bottom-10 right-6 flex items-center gap-2 px-4 py-3 rounded-full bg-black dark:bg-white shadow cursor-pointer pointer-events-auto"
    style="position: fixed !important; z-index: 99999 !important;"
  >
    <Spark class="w-5 h-5" />
  </button>
{/if}

<!-- Overlay + Panel -->
{#if isOpen}
  <div class="fixed inset-0 z-50">
    <!-- overlay -->
    <div
      class="absolute inset-0"
      on:click={() => closeChat()}
      on:keydown={(e) => e.key === "Escape" && closeChat()}
      transition:fade={{ duration: 300, easing: quintOut }}
      aria-hidden="true"
    />

    <!-- panel -->
    <aside
      bind:this={chatWindow}
      role="dialog"
      aria-modal="true"
      class="absolute right-0 top-0 bottom-0 w-full md:w-[440px] lg:w-[560px] max-w-full z-60 bg-white/95 dark:bg-[#0b0b0c]/95 backdrop-blur-xl border-l border-white/20 dark:border-gray-700/30 shadow-2xl flex flex-col"
      style="transform-origin: right center;"
      transition:slide={{ duration: 400, easing: quintOut, axis: "x" }}
    >
      <!-- Header -->
      <header
        role="banner"
        class="flex items-center justify-between px-4 py-4 cursor-default select-none"
        on:mousedown={startDrag}
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-md flex items-center justify-center">
              <span class="text-sm font-semibold">AI</span>
            </div>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium truncate">New Chat</div>
            <div class="text-xs truncate">
              AI Assistant • Press Ctrl+Enter to send • Esc to close
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            on:click={newChat}
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="New chat (Ctrl+N)"
            aria-label="New chat"
          >
            <Plus class="w-4 h-4 " />
          </button>
          <button
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Chat history"
            aria-label="Chat history"
          >
            <History class="w-4 h-4 " />
          </button>
          <button
            on:click={() => toggleFullscreen()}
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle fullscreen (F11)"
            aria-label="Toggle fullscreen"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="m21 9-4-4 4-4" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3" />
              <path d="M9 21H6a2 2 0 0 1-2-2v-3" />
              <path d="M21 15v3a2 2 0 0 1-2 2h-3" />
            </svg>
          </button>
          <button
            on:click={closeChat}
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X class="w-4 h-4 " />
          </button>
        </div>
      </header>

      <!-- Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- messages -->
        <div
          bind:this={chatContainer}
          class="flex-1 px-4 py-4 space-y-4 overflow-y-auto scroll-smooth"
        >
          {#each messages as message, index (index)}
            <ChatMessage
              {message}
              {index}
              showSources={true}
              editable={true}
              isEditing={editingMessageIndex === index}
              on:relatedQuestionClick={handleRelatedQuestionClick}
              on:rewriteResponse={rewriteResponse}
              on:editMessage={editMessage}
              on:startEdit={handleStartEdit}
              on:cancelEdit={handleCancelEdit}
            />
          {/each}

          {#if isLoading}
            <div
              class="flex items-center gap-3 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-3"
              transition:fly={{ y: 10, duration: 300, easing: quintOut }}
            >
              <div class="flex space-x-1">
                <div
                  class="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                ></div>
                <div
                  class="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                  style="animation-delay: 0.1s"
                ></div>
                <div
                  class="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"
                  style="animation-delay: 0.2s"
                ></div>
              </div>
              <span class="text-sm font-medium">AI is thinking...</span>
            </div>
          {/if}

          <div bind:this={bottomEl} />
        </div>

        <!-- Input area -->
        <div
          class="px-4 py-4 border-t border-white/20 dark:border-gray-700/30 bg-white/90 dark:bg-[#0b0b0c]/90 backdrop-blur-md"
        >
          <div
            class="block p-3 w-full border border-gray-300 dark:border-gray-600 rounded-[5px] overflow-hidden bg-white dark:bg-[#2A2E39]"
          >
            <div
              bind:this={editorDiv}
              role="textbox"
              aria-label="Message input"
              aria-multiline="true"
              class="editor-container ml-2 bg-white dark:bg-[#2A2E39] w-full min-h-[50px]"
              on:keydown={handleKeyDown}
            />

            <!-- Suggestions Dropdown -->
            {#if showSuggestions}
              <ul
                class="absolute bg-white dark:bg-default rounded-[5px] shadow border border-gray-300 dark:border-gray-600 mt-1 z-60 w-56 h-fit max-h-56 overflow-y-auto scroller"
                style="top: {suggestionPos?.top}px; left: {suggestionPos?.left}px;"
              >
                {#each suggestions as suggestion, i}
                  <li
                    class="px-2 py-1 cursor-pointer sm:hover:bg-gray-100 dark:sm:hover:bg-[#1E222D] text-sm {i ===
                    selectedSuggestion
                      ? ' bg-gray-100 dark:bg-[#1E222D]'
                      : ''}"
                    on:click={() => insertSuggestion(suggestion)}
                  >
                    {suggestion}
                  </li>
                {/each}
              </ul>
            {/if}
            <form
              class="grow rounded relative flex items-center w-full overflow-hidden"
            >
              <div
                class="relative min-h-12 h-auto overflow-y-hidden w-full outline-none"
              >
                <div
                  class="absolute bottom-0 flex flex-row justify-end w-full bg-white dark:bg-[#2A2E39]"
                >
                  <div class="flex flex-row justify-between w-full">
                    <div class="flex items-center"></div>

                    <label
                      on:click={() => llmChat()}
                      class="{editorText?.trim()?.length > 0
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-60'} py-2 text-[1rem] rounded border border-gray-300 dark:border-gray-800 bg-black dark:bg-white px-3 transition-colors"
                    >
                      {#if isLoading}
                        <svg
                          class="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-dasharray="31.416"
                            stroke-dashoffset="31.416"
                          >
                            <animate
                              attributeName="stroke-dasharray"
                              dur="2s"
                              values="0 31.416;15.708 15.708;0 31.416"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="stroke-dashoffset"
                              dur="2s"
                              values="0;-15.708;-31.416"
                              repeatCount="indefinite"
                            />
                          </circle>
                        </svg>
                      {:else}
                        <ArrowUp
                          class="w-4 h-4 text-center m-auto flex justify-center items-center "
                        />
                      {/if}
                    </label>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </aside>
  </div>
{/if}

<style>
  /* Base textarea styling */
  .textarea-base {
    background: transparent;
    position: relative;
    z-index: 1;
    color: currentColor;
    resize: none;
    white-space: pre-wrap;
  }

  :global(.ProseMirror) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
    min-height: 56px;
    white-space: pre-wrap;
    word-break: break-word;
    padding: 0;
    line-height: 1.5;
    font-size: 14px;
  }

  :global(.ProseMirror:focus) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }

  :global(.ProseMirror:focus-visible) {
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }

  /* Target the editor container div */
  .editor-container {
    outline: none !important;
  }

  .editor-container:focus {
    outline: none !important;
  }

  .editor-container:focus-within {
    outline: none !important;
  }

  /* Remove focus from any child elements */
  .editor-container * {
    outline: none !important;
  }

  .editor-container *:focus {
    outline: none !important;
  }

  :global(.ProseMirror p) {
    margin: 0;
    line-height: inherit;
  }
  :global(.ProseMirror .text-blue-800) {
    color: rgb(30 64 175) !important;
  }
  :global(.dark .ProseMirror .text-blue-400) {
    color: rgb(96 165 250) !important;
  }

  /* Enhanced scrollbar styling */
  :global(.overflow-y-auto::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }
  :global(.overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }
  :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    transition: background 0.2s;
  }
  :global(.dark .overflow-y-auto::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.2);
  }
  :global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
    background: rgba(0, 0, 0, 0.3);
  }
  :global(.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Smooth animations */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Custom backdrop blur effects */
  @supports (backdrop-filter: blur(20px)) {
    .backdrop-blur-custom {
      backdrop-filter: blur(20px) saturate(180%);
    }
  }

  /* Enhanced focus states */
  .focus-ring {
    @apply focus:outline-none;
  }
  .focus-ring:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  }

  /* Smooth entrance animation */
  .slide-in-right {
    animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  @keyframes slideInRight {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
