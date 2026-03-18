# 🗣️ Toast Guide System - Speech-Enabled User Guidance

## 🎯 **Overview**

The Toast Guide System provides contextual, speech-enabled notifications to help users discover and learn about Ask-Amo's features. It combines visual notifications with optional voice guidance for an accessible, hands-free learning experience.

## 🔧 **System Architecture**

### **Core Components**

#### **1. Toast Component** (`Toast.tsx`)
- **Visual Notifications**: Modern toast design with icons and actions
- **Speech Integration**: Built-in text-to-speech with toggle controls
- **Type System**: Different types for different purposes (info, success, warning, error, guide, tip)
- **Category Badges**: Visual categorization (navigation, feature, workflow, tip, help)
- **Responsive Design**: Mobile-optimized with smooth animations

#### **2. Toast Service** (`toastService.ts`)
- **State Management**: Centralized toast state with subscription pattern
- **Convenience Methods**: Pre-configured methods for different toast types
- **Speech Control**: Per-toast speech enable/disable settings
- **Queue Management**: Add, remove, and clear toasts
- **Persistence**: Optional persistent toasts that don't auto-close

#### **3. Toast Guide Service** (`toastGuideService.ts`)
- **Guide Library**: Comprehensive collection of contextual guides
- **Trigger System**: Automatic guide triggering based on user actions
- **Smart Timing**: Contextual timing based on session duration and user behavior
- **Progress Tracking**: Tracks which guides have been shown
- **Adaptive Learning**: Learns from user interactions to optimize guide timing

## 🎨 **Toast Types & Categories**

### **Toast Types**
- **Info**: General information and announcements
- **Success**: Successful operations and achievements
- **Warning**: Important notices and cautions
- **Error**: Errors and problems requiring attention
- **Guide**: Feature introductions and tutorials
- **Tip**: Helpful suggestions and best practices

### **Toast Categories**
- **Navigation**: View switching and app navigation
- **Feature**: Specific feature explanations and introductions
- **Workflow**: Multi-step process guidance
- **Tip**: Pro tips and optimization suggestions
- **Help**: General assistance and support

## 🗣️ **Speech Integration**

### **Speech Features**
- **Text-to-Speech**: Built-in browser speech synthesis
- **Voice Selection**: Prefers female voices when available
- **Speed Control**: Optimized speech rate (0.9x) for clarity
- **Volume Control**: Adjustable volume (0.8) for comfortable listening
- **Toggle Control**: Per-toast speech enable/disable

### **Speech Content**
- **Auto-Generated**: Automatically creates speech from toast content
- **Custom Speech**: Override speech text for better voice experience
- **Context-Aware**: Different speech styles for different toast types
- **Interruption Handling**: Cancels previous speech when new toast appears

### **Voice Commands**
```typescript
// Enable/disable speech for individual toasts
toastService.toggleSpeech(toastId, enabled);

// Create toast with custom speech
toastService.guide(
  "Feature Title",
  "Feature description",
  "Custom speech text for better voice experience"
);
```

## 📚 **Guide Library**

### **Navigation Guides**
- **Welcome Guide**: Introduction to all 7 views
- **Navigation Tips**: How to switch between views
- **Tab Scrolling**: Horizontal scrolling explanation
- **Voice Commands**: Hands-free navigation

### **Feature Guides**

#### **Vocabulary Builder**
- **Introduction**: Overview of 4 tabs (Extract, Composer, Library, Review)
- **Web Extraction**: How to extract words from websites
- **AI Composition**: Using AI to create themed vocabulary
- **Review System**: Flashcard and progress tracking

#### **Sentence Builder**
- **Introduction**: 5 tabs overview (Generation, Templates, Word Tables, Rules, Statistics)
- **Template Usage**: How to use sentence templates
- **Word Options**: Managing word variations
- **Confidence Scoring**: Understanding quality metrics

#### **Intent Enhancer**
- **Introduction**: 5 tabs overview (Predictor, Keywords, Tags, Patterns, Analytics)
- **Keyword Management**: Adding and organizing keywords
- **Tag System**: Contextual tag combinations
- **Analytics**: Understanding prediction performance

#### **Other Views**
- **Web Browser**: Browsing, searching, and content import
- **Terminal**: Command execution and workflow
- **Code Editor**: Code writing and debugging

### **Workflow Guides**
- **Vocabulary Learning**: Step-by-step vocabulary building
- **Sentence Practice**: Structured sentence creation workflow
- **Intent Training**: Improving communication with Amo
- **Knowledge Building**: Importing and organizing information

### **Pro Tips**
- **Voice Commands**: Advanced voice control techniques
- **Knowledge Integration**: Optimizing knowledge base usage
- **Productivity**: Workflow optimization suggestions
- **Advanced Features**: Power user techniques

## ⚡ **Smart Triggering System**

### **Automatic Triggers**
- **View Navigation**: Triggers guides when entering specific views
- **Session Time**: Shows different guides based on session duration
- **User Behavior**: Adapts to user interaction patterns
- **Feature Discovery**: Introduces features when contextually appropriate

### **Timing Logic**
```typescript
// First-time user
if (sessionTime < 60000) {
  showWelcomeGuide();
  showNavigationTips();
}

// After 5 minutes
if (sessionTime > 300000) {
  showWorkflowGuides();
  showProTips();
}

// Repeated view visits
if (viewCount > 2 && sessionTime > 180000) {
  showAdvancedFeatures();
}
```

### **Condition-Based Triggers**
- **First-Time Visits**: Introduction guides for new views
- **Repeated Usage**: Advanced tips for experienced users
- **Error Context**: Help guides when users encounter problems
- **Feature Completion**: Celebration toasts for achievements

## 🎯 **Guide Content Strategy**

### **Content Principles**
- **Concise**: Short, focused messages
- **Actionable**: Clear next steps and actions
- **Contextual**: Relevant to current user activity
- **Progressive**: Builds knowledge incrementally

### **Speech Optimization**
- **Natural Language**: Conversational speech style
- **Clear Pronunciation**: Avoids complex terminology
- **Appropriate Pace**: Comfortable listening speed
- **Context Clues**: Provides context for better understanding

### **Visual Design**
- **Color Coding**: Different colors for different types
- **Iconography**: Intuitive icons for quick recognition
- **Category Badges**: Visual categorization
- **Animation**: Smooth transitions and micro-interactions

## 🔧 **Implementation Examples**

### **Basic Toast Creation**
```typescript
// Simple info toast
toastService.info("Tip", "Use voice commands for hands-free control");

// Success toast with action
toastService.success(
  "Vocabulary Created",
  "Successfully created vocabulary set with 25 words",
  {
    action: {
      label: "View Set",
      onClick: () => navigateToVocabulary()
    }
  }
);
```

### **Speech-Enabled Guide**
```typescript
// Feature introduction with speech
toastService.guide(
  "Vocabulary Builder",
  "Extract words from websites and create AI-powered vocabulary sets",
  "Welcome to the Vocabulary Builder. You can extract words from websites and create themed vocabulary sets with AI assistance.",
  {
    category: 'feature',
    duration: 10000,
    speechEnabled: true
  }
);
```

### **Workflow Guidance**
```typescript
// Multi-step workflow guide
toastService.workflow(
  "Step 1: Extract Words",
  "Enter a URL to extract vocabulary words from the website",
  "Step 2: Review Results",
  {
    category: 'workflow',
    action: {
      label: "Next Step",
      onClick: () => showNextStep()
    }
  }
);
```

### **Navigation Guide**
```typescript
// Contextual navigation help
toastService.navigation(
  "Quick Navigation",
  "Use voice commands or tap tabs to switch between views",
  "vocabulary",
  {
    action: {
      label: "Go to Vocabulary",
      onClick: () => setActiveView('vocabulary')
    }
  }
);
```

## 📱 **Mobile Optimization**

### **Touch Interface**
- **Large Touch Targets**: Easy-to-tap buttons and controls
- **Gesture Support**: Swipe to dismiss, tap to interact
- **Responsive Layout**: Adapts to different screen sizes
- **Accessibility**: Screen reader and navigation support

### **Performance**
- **Efficient Rendering**: Optimized for mobile processors
- **Battery Conscious**: Minimal impact on battery life
- **Memory Management**: Efficient toast lifecycle management
- **Smooth Animations**: Hardware-accelerated transitions

## 🎮 **User Experience**

### **Onboarding Flow**
1. **Welcome Message**: Introduction to Ask-Amo
2. **Navigation Overview**: How to move between views
3. **Feature Discovery**: Contextual feature introductions
4. **Pro Tips**: Advanced usage suggestions
5. **Continuous Learning**: Ongoing guidance and tips

### **Learning Progression**
- **Beginner**: Basic navigation and core features
- **Intermediate**: Workflow optimization and advanced features
- **Advanced**: Pro tips and productivity techniques
- **Expert**: Customization and personalization

### **User Control**
- **Speech Toggle**: Enable/disable voice guidance
- **Dismiss Options**: Close individual or all toasts
- **Timing Control**: Adjust guide frequency and timing
- **Preference Memory**: Remembers user preferences

## 📊 **Analytics & Insights**

### **Usage Tracking**
- **Guide Effectiveness**: Which guides are most helpful
- **User Engagement**: Interaction rates and completion
- **Speech Usage**: Voice guide adoption and preferences
- **Timing Optimization**: Best times for showing guides

### **Performance Metrics**
- **Display Frequency**: How often guides are shown
- **Dismissal Rate**: When users close guides
- **Action Rate**: How often users take suggested actions
- **Speech Engagement**: Voice guide usage statistics

### **Improvement Loop**
- **User Feedback**: Collect feedback on guide usefulness
- **A/B Testing**: Test different guide content and timing
- **Content Optimization**: Refine messages based on performance
- **Personalization**: Adapt to individual user preferences

## 🚀 **Advanced Features**

### **Contextual Intelligence**
- **User State Awareness**: Considers current user activity
- **Learning Progression**: Adapts to user skill level
- **Behavioral Patterns**: Learns from user interactions
- **Personalization**: Customizes content for individual users

### **Integration Features**
- **View Integration**: Seamlessly works with all 7 views
- **Command Integration**: Responds to voice commands
- **Knowledge Integration**: References user's knowledge base
- **Workflow Integration**: Supports multi-step processes

### **Extensibility**
- **Custom Guides**: Easy to add new guide content
- **Plugin System**: Extensible for third-party integrations
- **API Access**: Programmatic control for advanced usage
- **Customization**: Configurable for different use cases

## 🎉 **Benefits**

### **For Users**
- **Faster Onboarding**: Quick feature discovery and learning
- **Better Understanding**: Clear explanations of complex features
- **Accessibility**: Voice guidance for hands-free learning
- **Personalized Experience**: Adaptive content based on usage
- **Continuous Learning**: Ongoing tips and improvements

### **For Developers**
- **Easy Integration**: Simple API for adding custom guides
- **Flexible Configuration**: Customizable timing and content
- **Analytics Insights**: Data-driven guide optimization
- **Maintenance**: Low overhead and easy updates
- **Extensibility**: Framework for future enhancements

## 📋 **Usage Examples**

### **Feature Introduction**
```typescript
// When user first opens Vocabulary Builder
toastGuideService.triggerGuides('vocabulary');
```

### **Workflow Assistance**
```typescript
// During vocabulary extraction process
toastService.workflow(
  "Extracting Words",
  "I'm analyzing the webpage to find important vocabulary words...",
  "Review Results"
);
```

### **Pro Tips**
```typescript
// After 10 minutes of usage
toastService.tip(
  "Voice Commands",
  "Try saying 'build vocabulary from example.com' for hands-free vocabulary extraction",
  "Pro tip: Use voice commands to navigate and control features without touching the screen."
);
```

### **Success Celebration**
```typescript
// When user completes a vocabulary set
toastService.success(
  "Vocabulary Set Complete!",
  "You've successfully created a vocabulary set with 25 words. Ready to start learning!",
  {
    category: 'feature',
    duration: 8000,
    speechEnabled: true
  }
);
```

---

## 🎯 **Conclusion**

The Toast Guide System provides a comprehensive, speech-enabled guidance system that helps users discover, learn, and master Ask-Amo's features. With contextual timing, personalized content, and voice integration, it creates an accessible, hands-free learning experience that adapts to each user's needs and skill level.

**Key Benefits:**
- **🗣️ Speech-Enabled**: Voice guidance for accessibility
- **🎯 Contextual**: Relevant help at the right time
- **📱 Mobile-Optimized**: Designed for touch interfaces
- **🧠 Adaptive Learning**: Improves based on user behavior
- **⚡ Smart Timing**: Intelligent guide scheduling
- **🎨 Beautiful Design**: Modern, accessible interface

**The system transforms how users learn about Ask-Amo, making feature discovery intuitive, accessible, and engaging.**
