.PHONY: all clean list save-images

# Find all subdirectories under challenges
CHALLENGE_DIRS := $(shell find challenges -mindepth 1 -maxdepth 1 -type d | sort)
# Extract just the directory names for image tags
CHALLENGE_NAMES := $(notdir $(CHALLENGE_DIRS))
# Create targets for each challenge
CHALLENGE_TARGETS := $(addprefix build-, $(CHALLENGE_NAMES))
# Create save targets for each challenge
SAVE_TARGETS := $(addprefix save-, $(CHALLENGE_NAMES))

# Default target builds all challenges
all: $(CHALLENGE_TARGETS)

# Pattern rule to build each challenge
build-%: 
	@echo "Building challenge: $*"
	@if [ -f challenges/$*/Dockerfile ]; then \
		docker build -t $* challenges/$*; \
	else \
		echo "Error: Dockerfile not found in challenges/$*"; \
		exit 1; \
	fi

# Pattern rule to save each challenge image as tar
save-%:
	@echo "Saving image $* as tar file"
	@mkdir -p handouts
	@docker save $* -o handouts/$*.tar

# Save all images as tar files
save-images: $(SAVE_TARGETS)
	@echo "All images saved to images/ directory"

# List all available challenges
list:
	@echo "Available challenges:"
	@for dir in $(CHALLENGE_NAMES); do \
		echo "  $$dir"; \
	done

# Clean up all built images
clean:
	@echo "Removing challenge images..."
	@for name in $(CHALLENGE_NAMES); do \
		docker rmi -f $$name 2>/dev/null || true; \
	done
	@rm -rvf handouts
	@echo "Done." 